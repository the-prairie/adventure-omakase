import { loadJSON } from '../scripts/operator-lib.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  COLUMNS,
  sqlValue,
  restoreSQL,
  validateBackup,
  comparableTables,
} from '../scripts/backup-format.mjs';
import { LocalD1, ROOT } from './local-bindings.mjs';
function sample() {
  const tables = Object.fromEntries(Object.keys(COLUMNS).map((t) => [t, []]));
  tables.trips = [
    {
      id: 'trip',
      singleton: 1,
      name: "Friends' trip",
      start: '2026-09-26',
      end: '2026-10-14',
      invite_token: 'invitation',
      invite_version: 1,
      created: '2026-09-06',
    },
  ];
  tables.members = [
    {
      id: 'm',
      trip_id: 'trip',
      name: 'Traveler',
      role: 'owner',
      recovery_hash: null,
      profile: '{}',
      active: 1,
      read_seq: 0,
      created: '2026-09-06',
    },
  ];
  return { schemaVersion: 3, tables };
}
test('SQL exporter escapes apostrophes and rejects nonprimitive values', () => {
  assert.equal(sqlValue("Mina's café"), "'Mina''s café'");
  assert.equal(sqlValue(null), 'NULL');
  assert.throws(() => sqlValue({}), /Unsupported/);
  assert.throws(() => sqlValue('a\0b'), /NUL/);
});
test('backups reject unexpected columns and invalid photo IDs', () => {
  const b = sample();
  b.tables.trips[0]['injected;drop'] = 'x';
  assert.throws(() => validateBackup(b), /Unexpected/);
  const c = sample();
  c.tables.photos = [{ id: '../unsafe', sha256: 'x' }];
  assert.throws(() => validateBackup(c), /Invalid photograph/);
});
test('full SQL restore round-trips more than a Worker request-sized batch', async () => {
  const b = sample();
  for (let i = 0; i < 400; i++)
    b.tables.moments.push({
      id: 'note' + i,
      trip_id: 'trip',
      member_id: 'm',
      body: JSON.stringify({ text: "We didn't plan this " + i, photos: [] }),
      visibility: i % 2 ? 'group' : 'private',
      revision: 1,
      deleted: 0,
      request_id: null,
      created: '2026-09-06',
      updated: '2026-09-06',
    });
  b.schemaVersion = 5;
  b.tables.service_budget = [
    { id: 'companion', used: 1234, reserved: 2100000 },
  ];
  b.tables.travel_tasks = [
    {
      id: 'helper',
      member_id: 'm',
      trip_id: 'trip',
      kind: 'memory',
      status: 'complete',
      result: '{"translated":"A private draft"}',
      created: '2026-09-06',
      updated: '2026-09-06',
    },
  ];
  b.tables.watches = [
    {
      id: 'watch',
      member_id: 'm',
      trip_id: 'trip',
      url: 'https://example.com',
      title: 'Public page',
      phrase: '',
      status: 'active',
      expires: '2026-09-07',
      next_check: '2026-09-06',
      last_checked: null,
      digest: 'baseline',
      excerpt: 'Public text',
      failures: 0,
      created: '2026-09-06',
      lease: null,
      lease_until: null,
    },
  ];
  b.tables.watch_events = [
    {
      id: 'event',
      watch_id: 'watch',
      member_id: 'm',
      summary: 'Changed',
      before_text: 'Before',
      after_text: 'After',
      created: '2026-09-06',
      seen: 0,
    },
  ];
  const db = new LocalD1();
  db.db.exec(await readFile(join(ROOT, 'migrations/0001_friends.sql'), 'utf8'));
  db.db.exec(
    await readFile(join(ROOT, 'migrations/0002_ask_omakase.sql'), 'utf8'),
  );
  db.db.exec(
    await readFile(join(ROOT, 'migrations/0003_travel_companion.sql'), 'utf8'),
  );
  db.db.exec(restoreSQL(b));
  const restored = Object.fromEntries(
    Object.keys(COLUMNS).map((t) => [
      t,
      db.db
        .prepare('SELECT * FROM ' + t)
        .all()
        .map((r) => ({ ...r })),
    ]),
  );
  assert.deepEqual(comparableTables(restored), comparableTables(b.tables));
  assert.equal(
    db.db.prepare("SELECT 1 FROM app_meta WHERE key='restoring'").get(),
    undefined,
  );
  db.close();
});
test('restore SQL never contains destructive table drops or session tokens', () => {
  const s = restoreSQL(sample());
  assert.equal(
    /DROP TABLE|INSERT INTO sessions|DELETE FROM trips/.test(s),
    false,
  );
});
test('Cloudflare configuration has isolated bindings, no account secrets, and no public photo bucket', async () => {
  const c = await loadJSON('wrangler.jsonc');
  assert.equal(c.main, 'src/worker.ts');
  assert.equal(c.d1_databases[0].binding, 'DB');
  assert.equal(c.r2_buckets[0].binding, 'PHOTOS');
  assert.equal(c.vars.SETUP_KEY, undefined);
  assert.ok(c.assets.run_worker_first.includes('/api/*'));
});
test('API cache policy and service worker do not cache shared state or photographs', async () => {
  const sw = await readFile(join(ROOT, 'public/sw.js'), 'utf8');
  assert.ok(!sw.includes("addEventListener('fetch'"));
  assert.match(sw, /caches.delete/);
});
test('release deployment is gated on actual local Cloudflare runtime tests', async () => {
  for (const path of ['scripts/cloudflare-setup.mjs', 'scripts/deploy.mjs'])
    assert.match(await readFile(join(ROOT, path), 'utf8'), /test:cloudflare/);
});

test('reload recovery recognizes only an exact local Miniflare GET fault', async () => {
  const { isLocalRuntimeDisconnect } =
    await import('./native/reload-transport.mjs');
  const fault = {
    method: 'GET',
    url: 'http://127.0.0.1:1234/',
    expectedOrigin: 'http://127.0.0.1:1234',
    status: 500,
    body: 'Error: Network connection lost.\n    at async Object.fetch (file:///tmp/node_modules/miniflare/dist/src/workers/core/entry.worker.js:5204:22)',
  };
  assert.equal(isLocalRuntimeDisconnect(fault), true);
  for (const change of [
    { method: 'POST' },
    { status: 200 },
    { url: 'https://example.com/' },
    { url: 'http://127.0.0.1:9999/' },
    { url: 'http://127.0.0.1:1234/api/state' },
    {
      body: fault.body.replace(
        'miniflare/dist/src/workers/core/entry.worker.js',
        'app.js',
      ),
    },
    { body: fault.body + '\nApplication error' },
    { body: 'Error: Network connection lost.' },
  ])
    assert.equal(isLocalRuntimeDisconnect({ ...fault, ...change }), false);
});

test('booking migration preserves populated helper rows and version-six backups restore them', async () => {
  const db = new LocalD1(),
    fresh = new LocalD1(),
    backup = sample();
  try {
    for (const name of [
      '0001_friends.sql',
      '0002_ask_omakase.sql',
      '0003_travel_companion.sql',
    ]) {
      const sql = await readFile(join(ROOT, 'migrations', name), 'utf8');
      db.db.exec(sql);
      fresh.db.exec(sql);
    }
    db.db.exec(restoreSQL(backup));
    db.db.exec(
      "INSERT INTO travel_tasks VALUES('existing','m','trip','memory','complete','{}','2026-09-06','2026-09-06')",
    );
    const before = db.db.prepare('SELECT * FROM travel_tasks').all();
    const migration = await readFile(
      join(ROOT, 'migrations/0004_profile_import.sql'),
      'utf8',
    );
    db.db.exec(migration);
    fresh.db.exec(migration);
    assert.deepEqual(db.db.prepare('SELECT * FROM travel_tasks').all(), before);
    db.db.exec(
      "INSERT INTO travel_tasks VALUES('booking','m','trip','profile-import','complete','{\"windows\":[]}','2026-09-06','2026-09-06')",
    );
    assert.throws(
      () =>
        db.db.exec(
          "INSERT INTO travel_tasks VALUES('bad','m','trip','unknown','complete','{}','2026-09-06','2026-09-06')",
        ),
      /CHECK/,
    );
    backup.schemaVersion = 6;
    backup.tables.travel_tasks = db.db
      .prepare('SELECT * FROM travel_tasks')
      .all()
      .map((r) => ({ ...r }));
    fresh.db.exec(restoreSQL(backup));
    assert.deepEqual(
      fresh.db.prepare('SELECT * FROM travel_tasks ORDER BY id').all(),
      db.db.prepare('SELECT * FROM travel_tasks ORDER BY id').all(),
    );
  } finally {
    db.close();
    fresh.close();
  }
});

test('every catalogue entry has a local credited photograph with explicit reference scope', async () => {
  const { runInNewContext } = await import('node:vm');
  const sandbox = { window: {} };
  runInNewContext(
    await readFile(join(ROOT, 'public/data.js'), 'utf8'),
    sandbox,
  );
  const catalogue = sandbox.window.OMAKASE.catalogue;
  assert.equal(catalogue.length, 300);
  const illustrated = catalogue.filter((entry) => entry.photo);
  assert.equal(illustrated.length, 300);
  const references = JSON.parse(
    await readFile(
      join(ROOT, 'public/assets/discovery/photographs.json'),
      'utf8',
    ),
  );
  assert.equal(
    new Set(references.flatMap((photo) => photo.catalogueIds)).size,
    245,
  );
  for (const reference of references) {
    assert.ok(
      reference.originalDate && reference.originalURL && reference.subject,
    );
    for (const id of reference.catalogueIds) {
      const photo = catalogue.find((entry) => entry.id === id).photo;
      assert.equal(photo.path, reference.path);
      assert.equal(photo.kind, reference.kind);
    }
  }
  for (const photo of illustrated.flatMap((entry) => [
    entry.photo,
    ...(entry.photos || []),
  ])) {
    assert.match(
      photo.path,
      /^\/assets\/discovery\/photos\/[a-z0-9-]+\.(?:webp|jpg)$/,
    );
    assert.ok((await readFile(join(ROOT, 'public', photo.path))).length > 1000);
    assert.match(
      photo.source,
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
    assert.match(photo.licenseUrl, /^https:\/\/creativecommons\.org\//);
    assert.ok(photo.author && photo.caption && photo.license);
    assert.ok(['place', 'area', 'activity'].includes(photo.kind));
    if (photo.kind === 'area') assert.match(photo.caption, /^Area view · /);
    if (photo.kind === 'activity')
      assert.match(photo.caption, /^Activity reference · /);
    assert.ok(photo.width > 0 && photo.width <= 960 && photo.height > 0);
    if (photo.smallPath) {
      const thumbnail = await readFile(join(ROOT, 'public', photo.smallPath));
      assert.ok(thumbnail.length > 1000);
      assert.equal(thumbnail.toString('ascii', 8, 12), 'WEBP');
      assert.ok(
        thumbnail.length <
          (await readFile(join(ROOT, 'public', photo.path))).length,
      );
    }
  }
  assert.equal(catalogue.filter((entry) => entry.experience).length, 56);
  for (const region of ['osaka', 'okinawa']) {
    assert.ok(
      catalogue.filter(
        (entry) => entry.id.startsWith(region + '-') && entry.experience,
      ).length >= 12,
    );
  }
  for (const { experience } of catalogue.filter((entry) => entry.experience)) {
    assert.match(
      experience.source,
      /^https:\/\/(www\.gotokyo\.org|saitama-supportdesk\.com|osaka-info\.jp|www\.gltjp\.com|dozeu\.com|taiyounotou-expo70\.jp|www\.cupnoodles-museum\.jp|www\.minpaku\.ac\.jp|katsuo-ji-temple\.or\.jp|himeji-kanko\.jp|www\.otagiji\.com|visitokinawajapan\.com|gangala\.com|www\.gyokusendo\.co\.jp|okimu\.jp|cruise\.visitokinawa\.jp|sachibaru\.jp|www\.japan\.travel|www\.shuri-ryusen\.com|www\.makishi-public-market\.jp|keramakayak\.jp|tabelog\.com)\//,
    );
    assert.match(experience.readAt, /^2026-09-(?:0[789]|10)$/);
    assert.ok(
      experience.summary && experience.planning && experience.highlights.length,
    );
  }
});

test('area references preserve provenance, geographic bounds and unlocated entries', async () => {
  const { runInNewContext } = await import('node:vm');
  const sandbox = { window: {} };
  for (const file of ['data.js', 'area-data.js'])
    runInNewContext(
      await readFile(join(ROOT, 'public', file), 'utf8'),
      sandbox,
    );
  const { catalogue, areas } = sandbox.window.OMAKASE;
  assert.equal(areas.length, 144);
  assert.equal(
    new Set(areas.map((p) => p.region + '/' + p.area)).size,
    areas.length,
  );
  for (const point of areas) {
    assert.ok(
      point.lat >= 24 &&
        point.lat <= 37 &&
        point.lng >= 122 &&
        point.lng <= 141,
    );
    assert.match(point.source, /^https:\/\/(en|ja)\.wikipedia\.org\/wiki\//);
    assert.equal(point.precision, 'area anchor');
    assert.ok(
      catalogue.some((a) => a.area === point.area && a.region === point.region),
    );
  }
  assert.equal(
    catalogue.filter((a) =>
      areas.some((p) => p.region === a.region && p.area === a.area),
    ).length,
    276,
  );
  assert.ok(
    !areas.some(
      (p) => p.area === 'Ibakita' || p.area.includes('arrange location'),
    ),
  );
  assert.ok(areas.find((p) => p.area === 'Namba').lng < 135.52);
});

test('curated outings resolve to source-backed local stops and retain catalogue parity', async () => {
  const { runInNewContext } = await import('node:vm');
  const sandbox = { window: {} };
  runInNewContext(
    await readFile(join(ROOT, 'public/data.js'), 'utf8'),
    sandbox,
  );
  const { catalogue, collections } = sandbox.window.OMAKASE;
  assert.equal(collections.length, 15);
  assert.equal(
    new Set(collections.map((item) => item.id)).size,
    collections.length,
  );
  for (const region of ['osaka', 'okinawa', 'tokyo']) {
    assert.equal(
      collections.filter((item) => item.region === region).length,
      { osaka: 4, okinawa: 8, tokyo: 3 }[region],
    );
  }
  const byId = new Map(catalogue.map((item) => [item.id, item]));
  for (const outing of collections) {
    for (const key of [
      'title',
      'pitch',
      'duration',
      'transport',
      'bestFor',
      'planning',
      'anchor',
      'leaveRoom',
    ]) {
      assert.ok(
        typeof outing[key] === 'string' && outing[key].trim(),
        `${outing.id}: ${key}`,
      );
    }
    assert.match(outing.duration, /planning estimate/);
    assert.equal(
      outing.readAt,
      outing.region === 'tokyo' ? '2026-09-10' : '2026-09-09',
    );
    assert.ok(outing.sources.length >= 1);
    for (const source of outing.sources) {
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(source.label);
    }
    assert.ok(outing.stops.length >= 1);
    assert.ok(
      ['local', 'day-trip', 'separate-stay'].includes(outing.travelScale),
    );
    assert.equal(
      new Set(outing.stops.map((stop) => stop.catalogueId)).size,
      outing.stops.length,
    );
    for (const stop of outing.stops) {
      const entry = byId.get(stop.catalogueId);
      assert.ok(entry, `${outing.id}: unknown stop ${stop.catalogueId}`);
      assert.equal(entry.region, outing.region);
      assert.ok(entry.experience?.planning && entry.experience?.source);
      assert.ok(stop.note);
      assert.ok(
        !entry.start && !entry.end,
        'evergreen outings must not depend on dated events',
      );
      assert.ok(
        !entry.flags.includes('o') ||
          ['day-trip', 'separate-stay'].includes(outing.travelScale),
        'island transfer stops must not masquerade as local outings',
      );
    }
  }
  // The browser and the read-only assistant must describe exactly the same discoveries.
  const serialized = JSON.stringify(catalogue);
  for (const file of ['public/catalogue.json', 'src/ask-catalogue.json']) {
    assert.equal(
      JSON.stringify(JSON.parse(await readFile(join(ROOT, file), 'utf8'))),
      serialized,
    );
  }
});

test('island chapters preserve existing transfer flags and keep onward directions outside the catalogue', async () => {
  const { runInNewContext } = await import('node:vm');
  const sandbox = { window: {} };
  runInNewContext(
    await readFile(join(ROOT, 'public/data.js'), 'utf8'),
    sandbox,
  );
  const { catalogue, collections, onwardIdeas } = sandbox.window.OMAKASE;
  assert.equal(catalogue.length, 300);
  assert.equal(
    collections.filter((item) => item.travelScale === 'separate-stay').length,
    3,
  );
  for (const item of collections.slice(0, 6)) {
    for (const stop of item.stops)
      assert.ok(
        !catalogue
          .find((entry) => entry.id === stop.catalogueId)
          .flags.includes('o'),
      );
  }
  const flags = {
    'okinawa-065': 'bow',
    'okinawa-067': 'o',
    'okinawa-068': 'o',
    'okinawa-077': 'o',
    'okinawa-078': 'o',
    'okinawa-080': 'o',
    'okinawa-086': 'bo',
    'okinawa-091': 'o',
    'okinawa-092': 'bo',
  };
  for (const [id, expected] of Object.entries(flags))
    assert.equal(catalogue.find((entry) => entry.id === id).flags, expected);
  assert.equal(onwardIdeas.length, 1);
  for (const idea of onwardIdeas) {
    assert.ok(!catalogue.some((entry) => entry.id === idea.id));
    assert.ok(!idea.stops && !idea.catalogueId);
    for (const key of [
      'title',
      'regionLabel',
      'pitch',
      'planning',
      'onward',
      'readAt',
    ])
      assert.ok(idea[key]);
    assert.match(idea.regionLabel, /Kyushu/);
    assert.match(idea.onward, /October.*not confirmed/);
    assert.ok(idea.sources.length >= 3);
    for (const source of idea.sources)
      assert.equal(new URL(source.url).protocol, 'https:');
  }
});

test('plan-intent migration preserves prior replies as unknown receipts and round-trips version-seven decisions', async () => {
  const old = new LocalD1(),
    fresh = new LocalD1();
  try {
    for (const name of [
      '0001_friends.sql',
      '0002_ask_omakase.sql',
      '0003_travel_companion.sql',
      '0004_profile_import.sql',
    ]) {
      const sql = await readFile(join(ROOT, 'migrations', name), 'utf8');
      old.db.exec(sql);
      fresh.db.exec(sql);
    }
    old.db.exec(restoreSQL(sample()));
    old.db.exec(
      "INSERT INTO members(id,trip_id,name,role,profile,active,read_seq,created) VALUES('guest','trip','Guest','member','{}',1,0,'2026-09-06')",
    );
    const body = JSON.stringify({
      title: 'Lunch',
      date: '2026-10-04',
      start: '12:00',
      end: '13:00',
      meeting: 'West entrance',
      joinStyle: 'open',
      segments: [],
      costLimit: 1500,
    });
    old.db
      .prepare(
        "INSERT INTO plans(id,trip_id,host_id,body,revision,status,created,updated) VALUES('plan','trip','m',?,1,'open','2026-09-06','2026-09-06')",
      )
      .run(body);
    old.db.exec(
      "INSERT INTO rsvps(plan_id,member_id,choice,status,accepted_revision,updated) VALUES('plan','guest','all','joined',1,'2026-09-06')",
    );
    const before = { ...old.db.prepare('SELECT * FROM rsvps').get() };
    const migration = await readFile(
      join(ROOT, 'migrations/0005_plan_intent.sql'),
      'utf8',
    );
    old.db.exec(migration);
    fresh.db.exec(migration);
    assert.deepEqual(
      { ...old.db.prepare('SELECT * FROM rsvps').get() },
      { ...before, accepted_body: null },
    );
    assert.equal(old.db.prepare('PRAGMA foreign_key_check').all().length, 0);
    old.db.exec(
      "UPDATE rsvps SET status='declined',accepted_body=NULL WHERE member_id='guest'",
    );
    assert.equal(
      old.db.prepare('SELECT accepted_body FROM rsvps').get().accepted_body,
      null,
    );
    old.db.exec(
      "UPDATE rsvps SET status='joined',accepted_body=NULL WHERE member_id='guest'",
    );
    assert.equal(
      old.db.prepare('SELECT accepted_body FROM rsvps').get().accepted_body,
      body,
    );
    old.db.exec(
      "UPDATE plans SET revision=2,status='cancelled' WHERE id='plan'",
    );
    const backup = {
      schemaVersion: 7,
      tables: Object.fromEntries(
        Object.keys(COLUMNS).map((t) => [
          t,
          old.db
            .prepare('SELECT * FROM ' + t)
            .all()
            .map((row) => ({ ...row })),
        ]),
      ),
    };
    fresh.db.exec(restoreSQL(validateBackup(backup)));
    const restored = Object.fromEntries(
      Object.keys(COLUMNS).map((t) => [
        t,
        fresh.db
          .prepare('SELECT * FROM ' + t)
          .all()
          .map((row) => ({ ...row })),
      ]),
    );
    assert.deepEqual(
      comparableTables(restored),
      comparableTables(backup.tables),
    );
    assert.equal(
      fresh.db.prepare('SELECT accepted_revision FROM rsvps').get()
        .accepted_revision,
      1,
    );
    assert.equal(fresh.db.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally {
    old.close();
    fresh.close();
  }
});
