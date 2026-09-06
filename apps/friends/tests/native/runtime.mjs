import { test as base } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {
  ROOT,
  wrangler,
  sleep,
  loadJSON,
} from '../../scripts/operator-lib.mjs';
export const TEST_KEY = 'synthetic-local-browser-owner-key-only';
async function freePort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
export const test = base.extend({
  companionFixture: [false, { option: true }],
  runtime: async ({ browserName, companionFixture }, use) => {
    const dir = await mkdtemp(
      join(tmpdir(), `omakase-${browserName}-browser-`),
    );
    const port = await freePort(),
      url = `http://127.0.0.1:${port}`;
    let proc;
    try {
      await wrangler(
        ['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', dir],
        { input: 'y\n', capture: true },
      );
      let fixtureArgs = [];
      if (companionFixture) {
        const cfg = await loadJSON('wrangler.jsonc');
        delete cfg.env;
        delete cfg.$schema;
        cfg.main = resolve(ROOT, 'tests/native/fixture-entry.mjs');
        cfg.assets.directory = resolve(ROOT, 'public');
        cfg.d1_databases[0].migrations_dir = resolve(ROOT, 'migrations');
        const path = join(dir, 'fixture.json');
        await writeFile(path, JSON.stringify(cfg));
        fixtureArgs = ['--config', path];
      }
      proc = spawn(
        process.execPath,
        [
          resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js'),
          'dev',
          ...fixtureArgs,
          '--local',
          '--ip',
          '127.0.0.1',
          '--port',
          String(port),
          '--persist-to',
          dir,
          '--test-scheduled',
          '--var',
          `SETUP_KEY:${TEST_KEY}`,
        ],
        {
          cwd: ROOT,
          env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let logs = '';
      proc.stdout.on('data', (b) => (logs += b));
      proc.stderr.on('data', (b) => (logs += b));
      let ready = false;
      for (let i = 0; i < 80; i++) {
        try {
          const r = await fetch(url + '/api/health');
          if (r.ok && (await r.json()).ok) {
            ready = true;
            break;
          }
        } catch {
          /* Startup not listening yet. */
        }
        if (proc.exitCode !== null) break;
        await sleep(250);
      }
      if (!ready)
        throw Error('Native workerd failed to start: ' + logs.slice(-3000));
      await use({ url, dir });
    } finally {
      if (proc) {
        proc.kill('SIGTERM');
        await sleep(350);
        if (proc.exitCode === null) proc.kill('SIGKILL');
      }
      await rm(dir, { recursive: true, force: true });
    }
  },
});
export { expect } from '@playwright/test';
