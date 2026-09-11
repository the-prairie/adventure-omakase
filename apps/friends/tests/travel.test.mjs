/** Deterministic provider contract tests. Never live-model acceptance evidence. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../build/worker.js';
import { makeEnv } from './local-bindings.mjs';
import {
  geminiGenerate,
  geminiModel,
  paidCall,
} from '../build/companion-provider.js';
import { findPlaces, getRoute, interpret } from '../build/travel-tools.js';
import { watchRoutes, checkWatches } from '../build/watch-service.js';
import {
  bookingAttachments,
  bookingResult,
  importBookings,
} from '../build/profile-import.js';
const fixtures = [];
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'omakase-travel-')),
    env = makeEnv(dir);
  fixtures.push({ dir, env });
  env.WATCHES_ENABLED = '1';
  const call = async (path, method = 'GET', body, cookie = '') => {
    const response = await worker.fetch(
      new Request('https://trip.example/api' + path, {
        method,
        headers: {
          Origin: 'https://trip.example',
          Cookie: cookie,
          'X-Omakase': '1',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      env,
      {
        waitUntil: () => {
          /* No background fixture work. */
        },
      },
    );
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie,
    };
  };
  const owner = await call('/trips', 'POST', {
    name: 'A',
    title: 'Synthetic travel tools',
    hostKey: env.SETUP_KEY,
  });
  const m = env.DB.db
    .prepare('SELECT * FROM members WHERE id=?')
    .get(owner.data.me.id);
  return { env, call, owner, m };
}
after(async () => {
  for (const { env, dir } of fixtures) {
    env.DB.close();
    await rm(dir, { recursive: true, force: true });
  }
});
const signal = () => new AbortController().signal;
test('interrupted travel requests expire privately without releasing unknown spend or expiring fresh work', async () => {
  const { env, call, owner } = await setup();
  const invitation = await call('/invite', 'GET', undefined, owner.cookie);
  const friend = await call('/join', 'POST', {
    name: 'Other traveler',
    token: invitation.data.token,
  });
  const old = new Date(Date.now() - 120000).toISOString();
  const fresh = new Date().toISOString();
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
  const insert = env.DB.db.prepare(
    'INSERT INTO travel_tasks(id,member_id,trip_id,kind,status,result,created,updated) VALUES(?,?,?,?,?,?,?,?)',
  );
  insert.run(
    ids[0],
    owner.data.me.id,
    owner.data.trip.id,
    'translate',
    'running',
    '{}',
    old,
    old,
  );
  insert.run(
    ids[1],
    owner.data.me.id,
    owner.data.trip.id,
    'profile-import',
    'running',
    '{}',
    fresh,
    fresh,
  );
  insert.run(
    ids[2],
    friend.data.me.id,
    friend.data.trip.id,
    'translate',
    'running',
    '{}',
    old,
    old,
  );
  insert.run(
    ids[3],
    owner.data.me.id,
    owner.data.trip.id,
    'translate',
    'complete',
    '{"original":"Already complete"}',
    old,
    old,
  );
  env.DB.db
    .prepare("INSERT INTO service_budget VALUES('companion',100,200)")
    .run();
  const expired = await call(
    '/travel/tasks/' + ids[0],
    'GET',
    undefined,
    owner.cookie,
  );
  assert.equal(expired.data.status, 'failed');
  assert.match(expired.data.result.message, /expired.*Start a new request/);
  const repeated = await call(
    '/travel/tasks',
    'POST',
    { requestId: ids[0], kind: 'translate', text: 'Do not run again' },
    owner.cookie,
  );
  assert.equal(repeated.data.status, 'failed');
  assert.equal(repeated.data.duplicate, true);
  const history = await call('/travel/tasks', 'GET', undefined, owner.cookie);
  assert.equal(
    history.data.tasks.find((task) => task.id === ids[1]).status,
    'running',
  );
  assert.equal(
    history.data.tasks.find((task) => task.id === ids[3]).result.original,
    'Already complete',
  );
  assert.equal(
    history.data.tasks.some((task) => task.id === ids[2]),
    false,
  );
  assert.equal(
    env.DB.db.prepare('SELECT status FROM travel_tasks WHERE id=?').get(ids[2])
      .status,
    'running',
  );
  assert.deepEqual(
    { ...env.DB.db.prepare('SELECT used,reserved FROM service_budget').get() },
    { used: 100, reserved: 200 },
  );
});
const modelData = (parts) => ({
  candidates: [{ finishReason: 'STOP', content: { parts } }],
  usageMetadata: {
    promptTokenCount: 100,
    candidatesTokenCount: 40,
    thoughtsTokenCount: 10,
  },
});

test('Gemini adapter preserves thought signatures and function identities across real protocol turns', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'private-fixture-key';
  let sent;
  const original = {
    functionCall: {
      name: 'check_sources',
      args: { discoveryIds: ['osaka-001'] },
    },
    thoughtSignature: 'signed-provider-state',
  };
  const model = geminiModel(env, signal(), async (_url, init) => {
    sent = JSON.parse(init.body);
    return Response.json(modelData([original]));
  });
  const first = await model.run('ignored', {
    messages: [
      { role: 'system', content: 'Keep authority in the app.' },
      { role: 'user', content: 'Read a source' },
    ],
    tools: [
      {
        function: {
          name: 'check_sources',
          parameters: { type: 'object', properties: {} },
        },
      },
    ],
    tool_choice: { function: { name: 'check_sources' } },
  });
  assert.equal(sent.toolConfig.functionCallingConfig.mode, 'ANY');
  assert.equal(sent.generationConfig.temperature, undefined);
  const call = first.choices[0].message.tool_calls[0];
  await model.run('ignored', {
    messages: [
      { role: 'system', content: 'Read only' },
      { role: 'user', content: 'Read a source' },
      { role: 'assistant', tool_calls: [call] },
      {
        role: 'tool',
        tool_call_id: call.id,
        name: 'check_sources',
        content: '[{"status":"read"}]',
      },
    ],
  });
  assert.deepEqual(sent.contents[1].parts[0], original);
  assert.equal(
    sent.contents[2].parts[0].functionResponse.name,
    'check_sources',
  );
  assert.equal(first.usage.completion_tokens, 50);
  assert.ok(
    env.DB.db.prepare('SELECT used FROM service_budget').get().used > 0,
  );
});
test('service budget reservations are atomic and failed calls retain their claim', async () => {
  const { env } = await setup();
  env.COMPANION_BUDGET_USD = '.3';
  let finish;
  const gate = new Promise((r) => (finish = r));
  const pending = paidCall(env, 0.2, async () => {
    await gate;
    return { value: 'done', costUSD: 0.01 };
  });
  await new Promise((r) => setTimeout(r, 0));
  await assert.rejects(
    paidCall(env, 0.2, async () => ({ value: 'bad', costUSD: 0 })),
    /budget/,
  );
  finish();
  assert.equal(await pending, 'done');
  await assert.rejects(
    paidCall(env, 0.2, async () => {
      throw Error('uncertain network result');
    }),
    /uncertain/,
  );
  const b = env.DB.db.prepare('SELECT * FROM service_budget').get();
  assert.equal(b.reserved, 0);
  assert.equal(b.used, 210000);
});
test('places and routes use provider responses and never turn published hours into availability', async () => {
  const { env } = await setup();
  env.GOOGLE_MAPS_API_KEY = 'private-maps-fixture';
  const p = await findPlaces(
    env,
    'Lunch in Namba',
    signal(),
    async (_u, init) => {
      assert.equal(JSON.parse(init.body).pageSize, 3);
      return Response.json({
        places: [
          {
            id: 'place-id',
            displayName: { text: 'Example Cafe' },
            formattedAddress: 'Example street, Osaka',
            regularOpeningHours: { weekdayDescriptions: ['Monday: 12–14'] },
            businessStatus: 'OPERATIONAL',
            websiteUri: 'http://example.com/',
          },
        ],
      });
    },
  );
  assert.equal(p.places[0].name, 'Example Cafe');
  assert.match(p.notice, /not confirmed/);
  assert.match(p.places[0].url, /query_place_id=place-id/);
  assert.ok(!JSON.stringify(p).includes('private-maps-fixture'));
  const r = await getRoute(
    env,
    'Namba',
    'Example cafe',
    'WALK',
    signal(),
    async (_u, init) => {
      assert.equal(JSON.parse(init.body).origin.address, 'Namba');
      return Response.json({
        routes: [{ duration: '780s', distanceMeters: 950 }],
      });
    },
  );
  assert.equal(r.minutes, 13);
  assert.equal(r.distanceMeters, 950);
  assert.match(r.notice, /not a safety/);
  await assert.rejects(
    getRoute(env, 'A', 'B', 'FLY', signal()),
    /Choose walking/,
  );
});
test('translation media and results remain private, cancellations before start are durable', async () => {
  const { env, call, owner } = await setup();
  const id = crypto.randomUUID();
  assert.equal(
    (await call('/travel/tasks/' + id + '/cancel', 'POST', {}, owner.cookie))
      .status,
    200,
  );
  assert.equal(
    (
      await call(
        '/travel/tasks',
        'POST',
        { requestId: id, kind: 'translate', text: '営業中' },
        owner.cookie,
      )
    ).data.status,
    'cancelled',
  );
  const inv = await call('/invite', 'GET', undefined, owner.cookie),
    b = await call('/join', 'POST', { name: 'B', token: inv.data.token });
  assert.equal(
    (await call('/travel/tasks/' + id, 'GET', undefined, b.cookie)).status,
    404,
  );
  env.GEMINI_API_KEY = 'private-key';
  await assert.rejects(
    interpret(
      env,
      { kind: 'translate', media: 'data:text/html;base64,abcd' },
      signal(),
    ),
    /resized JPEG/,
  );
});
test('route results are ephemeral and request idempotency does not reissue paid calls', async () => {
  const { env, call, owner } = await setup();
  env.GOOGLE_MAPS_API_KEY = 'private-key';
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return Response.json({
      routes: [{ duration: '600s', distanceMeters: 800 }],
    });
  };
  try {
    const input = {
      requestId: crypto.randomUUID(),
      kind: 'route',
      origin: 'Private starting address',
      destination: 'Namba',
      mode: 'WALK',
    };
    const a = await call('/travel/tasks', 'POST', input, owner.cookie);
    assert.equal(a.status, 200);
    assert.equal(a.data.result.minutes, 10);
    const dup = await call('/travel/tasks', 'POST', input, owner.cookie);
    assert.equal(count, 1);
    assert.equal(dup.data.result.ephemeral, true);
    const rows = await call('/travel/tasks', 'GET', undefined, owner.cookie);
    assert.ok(!JSON.stringify(rows.data).includes('Private starting address'));
  } finally {
    globalThis.fetch = original;
  }
});
test('scheduled watches establish a baseline, notify on change once, and honour cancellation and ownership', async () => {
  const { env, m } = await setup();
  let version = 'Original published information. '.repeat(10),
    calls = 0;
  const fetcher = async (url) => {
    calls++;
    return String(url).includes('dns-query')
      ? Response.json({ Answer: [{ type: 1, data: '8.8.8.8' }] })
      : new Response('<html><p>' + version + '</p></html>', {
          headers: { 'content-type': 'text/html' },
        });
  };
  const post = new Request('https://trip.example/api/travel/watches', {
    method: 'POST',
  });
  await assert.rejects(
    watchRoutes(
      post,
      env,
      m,
      { url: 'https://example.com', title: 'Venue', hours: 24, confirm: false },
      fetcher,
    ),
    /Confirm/,
  );
  const response = await watchRoutes(
      post,
      env,
      m,
      { url: 'https://example.com', title: 'Venue', hours: 24, confirm: true },
      fetcher,
    ),
    saved = await response.json();
  assert.equal(response.status, 201);
  assert.equal(
    env.DB.db.prepare('SELECT count(*) n FROM watch_events').get().n,
    0,
  );
  version = 'Changed published information. '.repeat(10);
  const first = await checkWatches(
    env,
    new Date(Date.now() + 3601000),
    fetcher,
  );
  assert.equal(first.changes, 1);
  await checkWatches(env, new Date(Date.now() + 7202000), fetcher);
  assert.equal(
    env.DB.db.prepare('SELECT count(*) n FROM watch_events').get().n,
    1,
  );
  const event = env.DB.db.prepare('SELECT * FROM watch_events').get();
  assert.match(event.summary, /does not confirm/);
  assert.match(event.before_text, /Original/);
  assert.match(event.after_text, /Changed/);
  await assert.rejects(
    watchRoutes(
      new Request(
        'https://trip.example/api/travel/watches/' + saved.id + '/cancel',
        { method: 'POST' },
      ),
      env,
      { ...m, id: 'other' },
      {},
    ),
    /not yours/,
  );
  await watchRoutes(
    new Request(
      'https://trip.example/api/travel/watches/' + saved.id + '/cancel',
      { method: 'POST' },
    ),
    env,
    m,
    {},
  );
  const before = calls;
  await checkWatches(env, new Date(Date.now() + 10803000), fetcher);
  assert.equal(calls, before);
});
test('watches pause after repeated failure and restored environments do not resume jobs', async () => {
  const { env, m } = await setup();
  const fetcher = async (url) =>
    String(url).includes('dns-query')
      ? Response.json({ Answer: [{ type: 1, data: '8.8.8.8' }] })
      : new Response('No', { status: 503 });
  await watchRoutes(
    new Request('https://trip.example/api/travel/watches', { method: 'POST' }),
    env,
    m,
    {
      url: 'https://example.com',
      title: 'Unavailable venue',
      hours: 24,
      confirm: true,
    },
    fetcher,
  );
  await checkWatches(env, new Date(Date.now() + 3601000), fetcher);
  await checkWatches(env, new Date(Date.now() + 7202000), fetcher);
  assert.equal(
    env.DB.db.prepare('SELECT status FROM watches').get().status,
    'failed',
  );
  assert.equal(
    env.DB.db.prepare('SELECT count(*) n FROM watch_events').get().n,
    1,
  );
  env.WATCHES_ENABLED = '0';
  assert.equal((await checkWatches(env)).disabled, true);
});

test('unbounded built-in search is rejected before spend and full model capacity is reserved', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  const { geminiGenerate } = await import('../build/companion-provider.js');
  let calls = 0;
  const provider = async () => {
    calls++;
    return Response.json(modelData([{ text: 'ok' }]));
  };
  await assert.rejects(
    geminiGenerate(env, { tools: [{ googleSearch: {} }] }, signal(), provider),
    /Unbounded/,
  );
  assert.equal(calls, 0);
  env.DB.db
    .prepare("INSERT INTO service_budget VALUES('companion',4000000,0)")
    .run();
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, signal(), provider),
    /budget/,
  );
  assert.equal(calls, 0);
});

test('interpretation preserves text and sends supported media only on the explicit call', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return Response.json(
      modelData([
        {
          text: JSON.stringify({
            original: '今日は散歩しました。',
            translated: 'I went for a walk today.',
            romanization: '',
            notes: '',
          }),
        },
      ]),
    );
  };
  try {
    const r = await interpret(
      env,
      { kind: 'translate', media: 'data:image/png;base64,aGVsbG8=' },
      signal(),
    );
    assert.equal(r.original, '今日は散歩しました。');
    assert.equal(r.translated, 'I went for a walk today.');
    assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'image/png');
    assert.equal(body.generationConfig.candidateCount, 1);
    assert.equal(
      env.DB.db.prepare('SELECT count(*) n FROM moments').get().n,
      0,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('restarting the same watch cannot bypass the one-minute fetch cooldown', async () => {
  const { env, m } = await setup();
  let reads = 0;
  const fetcher = async (url) =>
    new URL(String(url)).hostname === 'cloudflare-dns.com'
      ? Response.json({ Answer: [{ type: 1, data: '8.8.8.8' }] })
      : (reads++,
        new Response(
          '<main>' + 'Public venue hours information. '.repeat(15) + '</main>',
          { headers: { 'Content-Type': 'text/html' } },
        ));
  const request = () =>
    new Request('https://trip.example/api/travel/watches', { method: 'POST' });
  const body = {
    url: 'https://example.com/venue',
    title: 'Venue',
    confirm: true,
  };
  await watchRoutes(request(), env, m, body, fetcher);
  assert.equal(reads, 1);
  await watchRoutes(request(), env, m, body, fetcher);
  assert.equal(reads, 1);
});

test('provider rejection exposes only safe diagnostics, never the key or raw prompt', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'private-fixture-key';
  const { geminiGenerate } = await import('../build/companion-provider.js');
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, signal(), async () =>
      Response.json(
        {
          error: {
            status: 'INVALID_ARGUMENT',
            message:
              'User location is not supported for API use. private-fixture-key private prompt',
          },
        },
        { status: 400 },
      ),
    ),
    (e) => {
      assert.match(e.message, /server location/);
      assert.match(e.message, /HTTP 400/);
      assert.doesNotMatch(e.message, /private-fixture-key|private prompt/);
      return true;
    },
  );
});

test('definite model rejection releases its reservation; transport failure retains it', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  const { geminiGenerate } = await import('../build/companion-provider.js');
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, signal(), async () =>
      Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 }),
    ),
    /HTTP 503/,
  );
  assert.equal(
    env.DB.db.prepare('SELECT used FROM service_budget').get().used,
    0,
  );
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, signal(), async () => {
      throw Error('Connection lost');
    }),
    /Connection lost/,
  );
  assert.equal(
    env.DB.db.prepare('SELECT used FROM service_budget').get().used,
    1050000,
  );
});

test('temporary Gemini unavailability retries and settles only reported successful usage', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  let attempts = 0;
  const result = await geminiGenerate(
    env,
    { contents: [] },
    signal(),
    async () => {
      attempts++;
      assert.equal(
        env.DB.db.prepare('SELECT reserved FROM service_budget').get().reserved,
        1050000,
      );
      if (attempts === 1)
        return Response.json(
          { error: { status: 'UNAVAILABLE' } },
          { status: 503 },
        );
      return Response.json(modelData([{ text: 'source-backed response' }]));
    },
  );
  assert.equal(attempts, 2);
  assert.equal(result.providerAttempts, 2);
  assert.deepEqual(
    { ...env.DB.db.prepare('SELECT used,reserved FROM service_budget').get() },
    { used: 263, reserved: 0 },
  );
});

test('Gemini retries are bounded and cancellation during backoff spends nothing', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  let attempts = 0;
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, signal(), async () => {
      attempts++;
      return Response.json(
        { error: { status: 'UNAVAILABLE' } },
        { status: 503 },
      );
    }),
    /HTTP 503/,
  );
  assert.equal(attempts, 3);
  const controller = new AbortController();
  attempts = 0;
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, controller.signal, async () => {
      attempts++;
      setTimeout(() => controller.abort(), 20);
      return Response.json(
        { error: { status: 'UNAVAILABLE' } },
        { status: 503 },
      );
    }),
    /abort/i,
  );
  assert.equal(attempts, 1);
  assert.deepEqual(
    { ...env.DB.db.prepare('SELECT used,reserved FROM service_budget').get() },
    { used: 0, reserved: 0 },
  );
});

test('Gemini does not retry quota, credential, invalid configuration or unknown billing outcomes', async () => {
  for (const status of [400, 403, 429, 504, 200]) {
    const { env } = await setup();
    env.GEMINI_API_KEY = 'fixture';
    let attempts = 0;
    await assert.rejects(
      geminiGenerate(env, { contents: [] }, signal(), async () => {
        attempts++;
        if (status === 200) throw Error('Unknown transport outcome');
        return Response.json(
          { error: { status: 'SERVICE_ERROR' } },
          { status },
        );
      }),
    );
    assert.equal(attempts, 1);
    assert.equal(
      env.DB.db.prepare('SELECT used FROM service_budget').get().used,
      status === 200 ? 1050000 : 0,
    );
  }
});

test('a Gemini task shares at most two retries across all model turns', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  let attempts = 0;
  const model = geminiModel(env, signal(), async () => {
    attempts++;
    return attempts % 2
      ? Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 })
      : Response.json(modelData([{ text: 'checked evidence' }]));
  });
  const input = { messages: [{ role: 'user', content: 'Synthetic check' }] };
  for (let turn = 0; turn < 2; turn++) {
    const result = await model.run('ignored', input);
    assert.equal(result.usage.provider_attempts, 2);
  }
  await assert.rejects(model.run('ignored', input), /HTTP 503/);
  assert.equal(attempts, 5);
});

test('long Retry-After is not shortened to force another Gemini request', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  let attempts = 0;
  await assert.rejects(
    geminiGenerate(env, { contents: [] }, signal(), async () => {
      attempts++;
      return Response.json(
        { error: { status: 'UNAVAILABLE' } },
        { status: 503, headers: { 'Retry-After': '30' } },
      );
    }),
    /HTTP 503/,
  );
  assert.equal(attempts, 1);
  assert.equal(
    env.DB.db.prepare('SELECT used FROM service_budget').get().used,
    0,
  );
});

test('Gemini tool responses preserve provider IDs, full model parts and parallel response grouping', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'fixture';
  const original = {
    role: 'model',
    parts: [
      { text: 'Synthetic context', thoughtSignature: 'text-signature' },
      {
        functionCall: {
          id: 'provider-call-a',
          name: 'check_sources',
          args: { discoveryIds: ['osaka-001'] },
        },
        thoughtSignature: 'call-signature',
      },
      {
        functionCall: {
          id: 'provider-call-b',
          name: 'check_sources',
          args: { discoveryIds: ['osaka-002'] },
        },
      },
    ],
  };
  let sent;
  const model = geminiModel(env, signal(), async (_url, init) => {
    sent = JSON.parse(init.body);
    return Response.json({
      ...modelData([]),
      candidates: [{ finishReason: 'STOP', content: original }],
    });
  });
  const first = await model.run('ignored', {
    messages: [{ role: 'user', content: 'Check these synthetic leads' }],
  });
  const message = first.choices[0].message;
  await model.run('ignored', {
    messages: [
      { role: 'user', content: 'Check these synthetic leads' },
      { role: 'assistant', ...message },
      ...message.tool_calls.map((c) => ({
        role: 'tool',
        tool_call_id: c.id,
        name: c.function.name,
        content: '[]',
      })),
    ],
  });
  assert.deepEqual(sent.contents[1], original);
  assert.equal(sent.contents.length, 3);
  assert.deepEqual(sent.contents[2], {
    role: 'user',
    parts: [
      {
        functionResponse: {
          id: 'provider-call-a',
          name: 'check_sources',
          response: { result: [] },
        },
      },
      {
        functionResponse: {
          id: 'provider-call-b',
          name: 'check_sources',
          response: { result: [] },
        },
      },
    ],
  });
});

const bookingWindow = (override = {}) => ({
  kind: 'flight',
  region: 'osaka',
  area: '',
  from: '2026-10-01',
  to: '',
  source: 1,
  yearSource: 'trip',
  evidence:
    'Synthetic flight arrives October 1 at 18:45 local time. Departure date is not shown.',
  uncertainty: '',
  ...override,
});
const bookingPDF =
  'data:application/pdf;base64,' +
  Buffer.from('%PDF-1.4\nSynthetic booking contract fixture\n%%EOF').toString(
    'base64',
  );

test('booking files are bounded inline documents, never remote URLs or spoofed types', () => {
  assert.equal(
    bookingAttachments([bookingPDF])[0].inlineData.mimeType,
    'application/pdf',
  );
  for (const files of [
    [],
    Array(5).fill(bookingPDF),
    ['https://example.com/booking.pdf'],
    ['data:application/pdf;base64,aGVsbG8='],
    ['data:application/pdf;base64,YWJ'],
    ['data:text/html;base64,PHNjcmlwdD4='],
  ])
    assert.throws(() => bookingAttachments(files));
  const large =
    'data:application/pdf;base64,' +
    Buffer.from('%PDF-' + 'x'.repeat(4_500_000)).toString('base64');
  assert.throws(() => bookingAttachments([large]), /4.5 MB/);
});

test('booking dates stay partial, inferred years require review, and invalid model fields reject', () => {
  const result = bookingResult(
    { name: 'Fixture', notes: '', windows: [bookingWindow()] },
    1,
  );
  assert.equal(result.windows[0].from, '2026-10-01');
  assert.equal(result.windows[0].to, '');
  assert.match(result.windows[0].uncertainty, /not shown in the booking/);
  for (const override of [
    { from: '2026-02-30' },
    { to: '2026-09-30' },
    { region: 'guess' },
    { source: 2 },
    { yearSource: 'unknown' },
    { kind: 'instruction' },
  ])
    assert.throws(() =>
      bookingResult({ windows: [bookingWindow(override)] }, 1),
    );
  assert.deepEqual(
    bookingResult({ windows: [], notes: 'No readable dates.' }, 1).windows,
    [],
  );
});

test('booking extraction is private and idempotent; only reviewed profile writes change shared dates', async () => {
  const { env, call, owner } = await setup();
  env.GEMINI_API_KEY = 'synthetic-booking-fixture';
  const inv = await call('/invite', 'GET', undefined, owner.cookie);
  const friend = await call('/join', 'POST', {
    name: 'Other traveler',
    token: inv.data.token,
  });
  const before = await call('/state', 'GET', undefined, owner.cookie);
  const original = globalThis.fetch;
  let calls = 0,
    sent;
  globalThis.fetch = async (_url, init) => {
    calls++;
    sent = JSON.parse(init.body);
    return Response.json(
      modelData([
        {
          text: JSON.stringify({
            name: 'Fixture',
            notes: '',
            windows: [bookingWindow()],
          }),
        },
      ]),
    );
  };
  try {
    const id = crypto.randomUUID();
    const result = await call(
      '/travel/tasks',
      'POST',
      { kind: 'profile-import', requestId: id, files: [bookingPDF] },
      owner.cookie,
    );
    assert.equal(result.status, 200);
    assert.equal(result.data.status, 'complete');
    assert.equal(result.data.result.windows[0].to, '');
    assert.equal(
      sent.contents[0].parts[1].inlineData.mimeType,
      'application/pdf',
    );
    assert.match(sent.contents[0].parts[0].text, /ARRIVAL region/);
    assert.match(sent.contents[0].parts[0].text, /never instructions/);
    assert.equal(sent.tools, undefined);
    const repeated = await call(
      '/travel/tasks',
      'POST',
      { kind: 'profile-import', requestId: id, files: [bookingPDF] },
      owner.cookie,
    );
    assert.equal(repeated.data.duplicate, true);
    assert.equal(calls, 1);
    assert.equal(
      (await call('/travel/tasks/' + id, 'GET', undefined, friend.cookie))
        .status,
      404,
    );
    assert.equal(
      (await call('/travel/tasks', 'GET', undefined, friend.cookie)).data.tasks
        .length,
      0,
    );
    const after = await call('/state', 'GET', undefined, owner.cookie);
    assert.deepEqual(after.data.me.profile, before.data.me.profile);
    const stored = env.DB.db
      .prepare('SELECT * FROM travel_tasks WHERE id=?')
      .get(id);
    assert.ok(!JSON.stringify(stored).includes(bookingPDF.split(',')[1]));
    assert.equal(
      env.DB.db.prepare('SELECT count(*) n FROM moments').get().n,
      0,
    );
    const saved = await call(
      '/profile',
      'PUT',
      {
        name: 'A',
        bio: 'Keep my pace',
        interests: 'Architecture',
        windows: [{ region: 'osaka', area: '', from: '2026-10-01', to: '' }],
        expected: {
          name: before.data.me.name,
          profile: before.data.me.profile,
        },
      },
      owner.cookie,
    );
    assert.equal(saved.status, 200);
    const shared = await call('/state', 'GET', undefined, friend.cookie);
    assert.equal(
      shared.data.members.find((m) => m.id === owner.data.me.id).profile
        .windows[0].to,
      '',
    );
    assert.ok(!JSON.stringify(shared.data).includes('Synthetic flight'));
  } finally {
    globalThis.fetch = original;
  }
});

test('incremental profile edits preserve open dates and reject stale snapshots without false change events', async () => {
  const { call, owner, env } = await setup();
  const initial = (await call('/state', 'GET', undefined, owner.cookie)).data
    .me;
  const payload = {
    name: initial.name,
    bio: 'Manual details',
    interests: 'Food',
    windows: [{ region: 'tokyo', area: 'Ueno', from: '', to: '' }],
    expected: { name: initial.name, profile: initial.profile },
  };
  assert.equal(
    (await call('/profile', 'PUT', payload, owner.cookie)).status,
    200,
  );
  const events = env.DB.db.prepare('SELECT count(*) n FROM changes').get().n;
  assert.equal(
    (await call('/profile', 'PUT', { ...payload, windows: [] }, owner.cookie))
      .status,
    409,
  );
  assert.equal(
    env.DB.db.prepare('SELECT count(*) n FROM changes').get().n,
    events,
  );
  const current = (await call('/state', 'GET', undefined, owner.cookie)).data
    .me;
  assert.equal(current.profile.bio, 'Manual details');
  assert.equal(current.profile.windows[0].from, '');
  const update = {
    name: current.name,
    ...current.profile,
    windows: [
      { ...current.profile.windows[0], from: '2026-10-02', to: '2026-10-05' },
    ],
    expected: { name: current.name, profile: current.profile },
  };
  assert.equal(
    (await call('/profile', 'PUT', update, owner.cookie)).status,
    200,
  );
  assert.equal(
    (
      await call(
        '/profile',
        'PUT',
        {
          ...update,
          expected: undefined,
          windows: [{ region: 'tokyo', from: '2026-02-30', to: '' }],
        },
        owner.cookie,
      )
    ).status,
    422,
  );
});

test('a missing booking year cannot silently use a conflicting or multi-year trip', async () => {
  const { env } = await setup();
  env.GEMINI_API_KEY = 'synthetic';
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      modelData([{ text: JSON.stringify({ windows: [bookingWindow()] }) }]),
    );
  try {
    for (const trip of [
      { start: '2027-09-26', end: '2027-10-14' },
      { start: '2026-12-20', end: '2027-01-04' },
    ])
      await assert.rejects(
        importBookings(env, { files: [bookingPDF] }, trip, signal()),
        /year is not clear/,
      );
  } finally {
    globalThis.fetch = original;
  }
});
