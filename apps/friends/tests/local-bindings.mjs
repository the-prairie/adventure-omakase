/** Test-only bindings. Execute the shipped Worker against REAL SQLite and files.
 * Not Cloudflare workerd: timing, quotas and provider semantics still need Wrangler tests.
 * The HTTP harness executes real API code. Browser tests use an explicit transport bridge; see their docstring.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export class LocalD1 {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=10000;');
  }
  prepare(sql) {
    const database = this.db;
    return new (class {
      constructor(values = []) {
        this.sql = sql;
        this.values = values;
      }
      bind(...values) {
        this.values = values;
        return this;
      }
      _execute() {
        const s = database.prepare(this.sql);
        let results = [],
          changes = 0;
        if (s.columns().length) {
          results = s.all(...this.values).map((r) => ({ ...r }));
          changes = /^\s*(INSERT|UPDATE|DELETE)/i.test(this.sql)
            ? database.prepare('SELECT changes() AS n').get().n
            : 0;
        } else {
          changes = Number(s.run(...this.values).changes);
        }
        return { success: true, results, meta: { changes } };
      }
      async first(column) {
        const r = this._execute().results[0];
        return r ? (column ? r[column] : r) : null;
      }
      async all() {
        return this._execute();
      }
      async run() {
        return this._execute();
      }
    })();
  }
  async batch(statements) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const values = statements.map((s) => s._execute());
      this.db.exec('COMMIT');
      return values;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  async exec(sql) {
    this.db.exec(sql);
    return {};
  }
  close() {
    this.db.close();
  }
}
export class LocalR2 {
  constructor(dir) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }
  path(key) {
    const p = resolve(this.dir, key);
    if (!p.startsWith(resolve(this.dir) + '/')) throw Error('Unsafe key');
    return p;
  }
  async put(key, value) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    const bytes =
      typeof value === 'string'
        ? Buffer.from(value)
        : value instanceof ReadableStream
          ? Buffer.from(await new Response(value).arrayBuffer())
          : Buffer.from(
              value.buffer || value,
              value.byteOffset || 0,
              value.byteLength,
            );
    await writeFile(p, bytes);
    return {};
  }
  async get(key) {
    try {
      const data = await readFile(this.path(key));
      return {
        body: new Response(data).body,
        size: data.length,
        arrayBuffer: async () =>
          data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
      };
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }
  async delete(key) {
    for (const k of Array.isArray(key) ? key : [key])
      await unlink(this.path(k)).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
  }
}
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
};
export function makeEnv(dir, { maintenance = false } = {}) {
  mkdirSync(dir, { recursive: true });
  const db = new LocalD1(join(dir, 'trip.sqlite'));
  if (!db.db.prepare("SELECT name FROM sqlite_master WHERE name='trips'").get())
    db.db.exec(readFileSync(join(ROOT, 'migrations/0001_friends.sql'), 'utf8'));
  if (
    !db.db
      .prepare("SELECT name FROM sqlite_master WHERE name='ask_tasks'")
      .get()
  )
    db.db.exec(
      readFileSync(join(ROOT, 'migrations/0002_ask_omakase.sql'), 'utf8'),
    );
  if (
    !db.db
      .prepare("SELECT name FROM sqlite_master WHERE name='travel_tasks'")
      .get()
  )
    db.db.exec(
      readFileSync(join(ROOT, 'migrations/0003_travel_companion.sql'), 'utf8'),
    );
  if (
    !db.db
      .prepare("SELECT sql FROM sqlite_master WHERE name='travel_tasks'")
      .get()
      .sql.includes('profile-import')
  )
    db.db.exec(
      readFileSync(join(ROOT, 'migrations/0004_profile_import.sql'), 'utf8'),
    );
  return {
    DB: db,
    PHOTOS: new LocalR2(join(dir, 'r2')),
    SETUP_KEY: 'local-development-only-change-before-hosting',
    TRIP_PHOTO_BUDGET_MB: '500',
    MAINTENANCE: maintenance ? '1' : '0',
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        let name = decodeURIComponent(url.pathname);
        if (name === '/') name = '/index.html';
        let path = resolve(ROOT, 'public', '.' + name);
        if (!path.startsWith(resolve(ROOT, 'public') + '/'))
          return new Response('Not found', { status: 404 });
        try {
          const bytes = await readFile(path);
          const ext = path.slice(path.lastIndexOf('.'));
          return new Response(bytes, {
            headers: {
              'Content-Type': TYPES[ext] || 'application/octet-stream',
            },
          });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      },
    },
  };
}
