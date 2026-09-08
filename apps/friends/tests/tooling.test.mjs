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

test('catalogue photographs retain unique local files, credits and source-linked guide provenance', async () => {
  const { runInNewContext } = await import('node:vm');
  const sandbox = { window: {} };
  runInNewContext(
    await readFile(join(ROOT, 'public/data.js'), 'utf8'),
    sandbox,
  );
  const catalogue = sandbox.window.OMAKASE.catalogue;
  assert.equal(catalogue.length, 300);
  const illustrated = catalogue.filter((entry) => entry.photo);
  assert.equal(illustrated.length, 25);
  assert.equal(new Set(illustrated.map((entry) => entry.photo.path)).size, 25);
  for (const { photo } of illustrated) {
    assert.match(photo.path, /^\/assets\/discovery\/photos\/[a-z0-9-]+\.webp$/);
    assert.ok((await readFile(join(ROOT, 'public', photo.path))).length > 1000);
    assert.match(
      photo.source,
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
    assert.match(photo.licenseUrl, /^https:\/\/creativecommons\.org\//);
    assert.ok(photo.author && photo.caption && photo.license);
  }
  for (const { experience } of catalogue.filter((entry) => entry.experience)) {
    assert.match(
      experience.source,
      /^https:\/\/(www\.gotokyo\.org|saitama-supportdesk\.com)\//,
    );
    assert.equal(experience.readAt, '2026-09-07');
    assert.ok(
      experience.summary && experience.planning && experience.highlights.length,
    );
  }
});
