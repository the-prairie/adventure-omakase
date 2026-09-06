import { AskError, record, type Usage } from './ask-contract.js';
import type { Model } from './ask-engine.js';
import type { Env, Row } from './platform.js';

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const providerName = (env: Env) =>
  env.GEMINI_API_KEY ? 'gemini' : 'cloudflare';
export const modelName = (env: Env) =>
  env.GEMINI_API_KEY ? GEMINI_MODEL : '@cf/openai/gpt-oss-120b';

/** Every paid call first claims a durable reservation. Crashes keep the reservation.
 * Dollars are estimates from published rates; provider invoices remain authoritative.
 * The preview defaults to a five-dollar lifetime ceiling, not a resetting allowance.
 */
export async function paidCall<T>(
  env: Env,
  reserveUSD: number,
  action: () => Promise<{ value: T; costUSD: number }>,
): Promise<T> {
  const limit = Math.min(
    5,
    Math.max(0, Number(env.COMPANION_BUDGET_USD || '5')),
  );
  const reserve = Math.ceil(reserveUSD * 1e6);
  await env.DB.prepare(
    "INSERT INTO service_budget(id,used,reserved) VALUES('companion',0,0) ON CONFLICT DO NOTHING",
  ).run();
  const claimed = await env.DB.prepare(
    "UPDATE service_budget SET reserved=reserved+? WHERE id='companion' AND used+reserved+?<=? RETURNING id",
  )
    .bind(reserve, reserve, Math.floor(limit * 1e6))
    .first();
  if (!claimed)
    throw new AskError(
      429,
      'The companion’s service budget is reserved or used. Ordinary trip features still work.',
    );
  try {
    const result = await action();
    if (!Number.isFinite(result.costUSD) || result.costUSD < 0)
      throw new Error('Unknown service usage');
    await env.DB.prepare(
      "UPDATE service_budget SET reserved=max(0,reserved-?),used=used+? WHERE id='companion'",
    )
      .bind(reserve, Math.ceil(result.costUSD * 1e6))
      .run();
    return result.value;
  } catch (e) {
    // Failed/aborted network calls can still be billed. Keep the whole claim consumed.
    await env.DB.prepare(
      "UPDATE service_budget SET reserved=max(0,reserved-?),used=used+? WHERE id='companion'",
    )
      .bind(reserve, reserve)
      .run();
    throw e;
  }
}
export function geminiUsage(data: Row) {
  const u = data.usageMetadata || {};
  const input = Number(u.promptTokenCount),
    output =
      Number(u.candidatesTokenCount || 0) + Number(u.thoughtsTokenCount || 0);
  if (!Number.isFinite(input) || input < 0)
    throw new AskError(
      502,
      'The model did not report usage. Its service reservation has been retained.',
    );
  const future = Date.now() >= Date.parse('2027-01-01T00:00:00Z');
  return {
    prompt_tokens: input,
    completion_tokens: output,
    neurons: 0,
    estimated_usd:
      (input * (future ? 1.5 : 0.75) + output * (future ? 7.5 : 3.75)) / 1e6,
  };
}
export async function geminiGenerate(
  env: Env,
  payload: Row,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Row> {
  if (!env.GEMINI_API_KEY)
    throw new AskError(
      503,
      'Translation and research need the configured Gemini service. Nothing was submitted.',
    );
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 2200000)
    throw new AskError(
      413,
      'This request is too large. Try a shorter text or smaller photograph.',
    );
  if (
    payload.tools?.some((t: Row) =>
      Object.keys(t).some((k) => k !== 'functionDeclarations'),
    )
  )
    throw new AskError(
      422,
      'Unbounded provider tools are disabled under the testing budget.',
    );
  payload = {
    ...payload,
    generationConfig: { ...payload.generationConfig, candidateCount: 1 },
  };
  // Full published model capacity at the higher 2027 rates: 1,048,576 input
  // and 65,536 output tokens cost at most $2.064384. No paid built-in tools.
  return paidCall(env, 2.1, async () => {
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY!,
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok)
      throw new AskError(
        response.status === 429 ? 429 : 502,
        response.status === 429
          ? 'The model service has reached its current quota. Try later.'
          : 'The model service could not complete this request. Nothing was published.',
      );
    const data = (await response.json()) as Row;
    const usage = geminiUsage(data);
    return { value: data, costUSD: usage.estimated_usd };
  });
}
export function geminiModel(
  env: Env,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Model {
  return {
    async run(_model, input) {
      const messages = input.messages as Row[];
      const contents: Row[] = [];
      const callNames = new Map<string, string>();
      for (const m of messages) {
        if (m.role === 'system') continue;
        if (m.role === 'tool') {
          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: m.name || callNames.get(m.tool_call_id),
                  response: { result: JSON.parse(m.content) },
                },
              },
            ],
          });
        } else if (m.role === 'assistant' && m.tool_calls?.length) {
          for (const c of m.tool_calls) callNames.set(c.id, c.function.name);
          contents.push({
            role: 'model',
            parts: m.tool_calls.map(
              (c: Row) =>
                c.geminiPart || {
                  functionCall: {
                    name: c.function.name,
                    args: JSON.parse(c.function.arguments),
                  },
                },
            ),
          });
        } else
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || '') }],
          });
      }
      const config: Row = {
        maxOutputTokens: Math.min(6000, Number(input.max_tokens || 6000)),
        thinkingConfig: { thinkingLevel: 'LOW' },
      };
      const schema = record(input.response_format || {}).json_schema as
        Row | undefined;
      if (schema) {
        config.responseMimeType = 'application/json';
        config.responseJsonSchema = schema.schema;
      }
      const payload: Row = {
        systemInstruction: {
          parts: [
            {
              text: messages
                .filter((m) => m.role === 'system')
                .map((m) => m.content)
                .join('\n'),
            },
          ],
        },
        contents,
        generationConfig: config,
      };
      if (input.tools) {
        payload.tools = [
          {
            functionDeclarations: (input.tools as Row[]).map((t) => ({
              name: t.function.name,
              description: t.function.description,
              parametersJsonSchema: t.function.parameters,
            })),
          },
        ];
        const choice = input.tool_choice as Row | undefined;
        payload.toolConfig = {
          functionCallingConfig: choice?.function
            ? { mode: 'ANY', allowedFunctionNames: [choice.function.name] }
            : { mode: 'AUTO' },
        };
      }
      const data = await geminiGenerate(env, payload, signal, fetcher);
      const candidate = data.candidates?.[0];
      if (!candidate || candidate.finishReason === 'MAX_TOKENS')
        throw new AskError(
          502,
          'The model could not finish within this task’s output limit. Narrow the request.',
        );
      const parts = candidate.content?.parts || [];
      return {
        choices: [
          {
            message: {
              content: parts
                .filter((p: Row) => p.text && !p.thought)
                .map((p: Row) => p.text)
                .join(''),
              tool_calls: parts
                .filter((p: Row) => p.functionCall)
                .map((p: Row, i: number) => ({
                  id: 'gemini-' + i,
                  type: 'function',
                  geminiPart: p,
                  function: {
                    name: p.functionCall.name,
                    arguments: JSON.stringify(p.functionCall.args),
                  },
                })),
            },
          },
        ],
        usage: geminiUsage(data),
      };
    },
  };
}
export function shortUsage(data: Row, started: number): Usage {
  const u = geminiUsage(data);
  return {
    model: GEMINI_MODEL,
    providerCalls: 1,
    sourceCalls: 0,
    cacheHits: 0,
    inputTokens: u.prompt_tokens,
    outputTokens: u.completion_tokens,
    neurons: 0,
    measured: true,
    estimatedUSD: u.estimated_usd,
    elapsedMs: Date.now() - started,
  };
}
