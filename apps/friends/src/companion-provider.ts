import { AskError, record, type Usage } from './ask-contract.js';
import type { Model } from './ask-engine.js';
import type { Env, Row } from './platform.js';

// Google documents that rejected 4xx/5xx requests do not incur token charges.
class RejectedModelRequest extends AskError {
  constructor(
    status: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(status, message);
  }
}

/** Only a received provider rejection proves this model call was unbilled. */
export const isDefiniteModelRejection = (error: unknown): boolean =>
  error instanceof RejectedModelRequest;

function retryDelay(response: Response): number | undefined {
  if (response.status !== 503) return undefined;
  const value = response.headers.get('Retry-After');
  if (!value) return 0;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - Date.now();
  // Do not retry earlier than the provider asks or spend the whole task waiting.
  return Number.isFinite(ms) && ms > 5000 ? undefined : Math.max(0, ms || 0);
}

async function waitForRetry(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

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
    // Only a definite provider rejection is unbilled. Lost responses/timeouts keep the claim.
    await env.DB.prepare(
      "UPDATE service_budget SET reserved=max(0,reserved-?),used=used+? WHERE id='companion'",
    )
      .bind(reserve, e instanceof RejectedModelRequest ? 0 : reserve)
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
  retries = { remaining: 2 },
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
  // Full published capacity costs at most $1.032192 now, $2.064384 in 2027.
  // No paid built-in tools and exactly one candidate.
  const reserveUSD =
    Date.now() >= Date.parse('2027-01-01T00:00:00Z') ? 2.1 : 1.05;
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const data = await paidCall(env, reserveUSD, async () => {
        signal.throwIfAborted();
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
        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as Row;
          const message = String(error.error?.message || '');
          const status = String(error.error?.status || '');
          const code = /^[A-Z_]{1,60}$/.test(status) ? status : 'SERVICE_ERROR';
          const explanation = /location.*not supported/i.test(message)
            ? 'The model is unavailable from this server location.'
            : /quota|resource.*exhausted/i.test(message)
              ? 'The model service has reached its current quota.'
              : /api.?key|permission|credential/i.test(message)
                ? 'The model rejected its configured credential.'
                : /thinking/i.test(message)
                  ? 'The model rejected the requested thinking configuration.'
                  : /schema|generation.config/i.test(message)
                    ? 'The model rejected the response configuration.'
                    : 'The model service could not complete this request.';
          throw new RejectedModelRequest(
            response.status === 429 ? 429 : 502,
            `${explanation} Provider HTTP ${response.status} (${code}). Nothing was published.`,
            retryDelay(response),
          );
        }
        const data = (await response.json()) as Row;
        const usage = geminiUsage(data);
        return { value: data, costUSD: usage.estimated_usd };
      });
      return { ...data, providerAttempts: attempt + 1 };
    } catch (error) {
      if (
        !(error instanceof RejectedModelRequest) ||
        error.retryAfterMs === undefined ||
        retries.remaining <= 0 ||
        attempt >= 2
      )
        throw error;
      // Definite 503 rejection has already released its reservation. Unknown
      // outcomes are never retried: the original call could still be billed.
      retries.remaining--;
      await waitForRetry(
        Math.max(error.retryAfterMs, 500 * 2 ** attempt + Math.random() * 250),
        signal,
      );
    }
  }
}
export function geminiModel(
  env: Env,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Model {
  // One task gets at most two extra HTTP attempts across all model turns.
  const retries = { remaining: 2 };
  return {
    async run(_model, input) {
      const messages = input.messages as Row[];
      const contents: Row[] = [];
      const calls = new Map<string, Row>();
      for (const m of messages) {
        if (m.role === 'system') continue;
        if (m.role === 'tool') {
          const call = calls.get(m.tool_call_id);
          const part = {
            functionResponse: {
              ...(call?.id ? { id: call.id } : {}),
              name: m.name || call?.name,
              response: { result: JSON.parse(m.content) },
            },
          };
          const previous = contents.at(-1);
          if (
            previous?.role === 'user' &&
            previous.parts.every((p: Row) => p.functionResponse)
          )
            previous.parts.push(part);
          else contents.push({ role: 'user', parts: [part] });
        } else if (m.role === 'assistant' && m.tool_calls?.length) {
          for (const c of m.tool_calls)
            calls.set(
              c.id,
              c.geminiPart?.functionCall || { name: c.function.name },
            );
          contents.push(
            m.geminiContent || {
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
            },
          );
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
      const data = await geminiGenerate(env, payload, signal, fetcher, retries);
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
              geminiContent: candidate.content,
              content: parts
                .filter((p: Row) => p.text && !p.thought)
                .map((p: Row) => p.text)
                .join(''),
              tool_calls: parts
                .filter((p: Row) => p.functionCall)
                .map((p: Row, i: number) => ({
                  id: p.functionCall.id || 'gemini-' + i,
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
        usage: {
          ...geminiUsage(data),
          provider_attempts: data.providerAttempts,
        },
      };
    },
  };
}
export function shortUsage(data: Row, started: number): Usage {
  const u = geminiUsage(data);
  return {
    model: GEMINI_MODEL,
    providerCalls: data.providerAttempts || 1,
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
