/** Deterministic provider contract tests. Never live-model acceptance evidence. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../build/worker.js';
import { makeEnv } from './local-bindings.mjs';
import { geminiModel, paidCall } from '../build/companion-provider.js';
import { findPlaces, getRoute, interpret } from '../build/travel-tools.js';
import { watchRoutes, checkWatches } from '../build/watch-service.js';
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
    String(url).includes('cloudflare-dns.com')
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
