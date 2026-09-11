/** REQUIRED gate before deployment: actual Wrangler/workerd with LOCAL D1/R2.
 * No Cloudflare account data is written. Fails closed if Wrangler is unavailable.
 * This gate was supplied but could not be executed in the build environment.
 */
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { ROOT, wrangler, sleep } from './operator-lib.mjs';
const dir = await mkdtemp(join(tmpdir(), 'omakase-workerd-')),
  port = 18743,
  base = `http://127.0.0.1:${port}`,
  key = 'local-workerd-smoke-key-not-production',
  report = {
    runtime: 'Wrangler workerd, local D1 and local R2',
    checks: [],
    started: new Date().toISOString(),
  };
let proc;
const check = (name, value) => {
  assert.ok(value, name);
  report.checks.push({ name, pass: true });
};
try {
  await wrangler(
    ['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', dir],
    { input: 'y\n' },
  );
  proc = spawn(
    process.execPath,
    [
      resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js'),
      'dev',
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--persist-to',
      dir,
      '--var',
      'SETUP_KEY:' + key,
    ],
    {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  proc.stdout.on('data', (v) => (logs += v));
  proc.stderr.on('data', (v) => (logs += v));
  proc.on('error', (e) => (logs += e.message));
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(base + '/api/health', {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok && (await r.json()).ok) {
        healthy = true;
        break;
      }
    } catch {
      /* Best-effort fallback; canonical server state is unchanged. */
    }
    if (proc.exitCode !== null) break;
    await sleep(750);
  }
  if (!healthy)
    throw Error('Local workerd did not start.\n' + logs.slice(-6000));
  async function call(path, { cookie = '', method = 'GET', data } = {}) {
    const r = await fetch(base + '/api' + path, {
      method,
      headers: {
        Cookie: cookie,
        Origin: base,
        'X-Omakase': '1',
        'Content-Type': 'application/json',
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const raw = await r.text();
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      d = raw;
    }
    return {
      status: r.status,
      data: d,
      cookie: r.headers.get('set-cookie')?.split(';')[0] || cookie,
    };
  }
  const owner = await call('/trips', {
    method: 'POST',
    data: {
      name: 'Runtime test owner',
      title: 'Local runtime test only',
      hostKey: key,
    },
  });
  check('Create a real trip in local D1', owner.status === 201);
  const inv = await call('/invite', { cookie: owner.cookie });
  const a = await call('/join', {
    method: 'POST',
    data: { name: 'Runtime friend', token: inv.data.token },
  });
  check('One-link, name-only join', a.status === 201);
  const p = await call('/plans', {
    cookie: owner.cookie,
    method: 'POST',
    data: {
      title: 'Run separately, tea together',
      region: 'osaka',
      area: 'Test',
      date: '2026-10-04',
      start: '07:30',
      end: '10:00',
      meeting: 'Synthetic test start',
      joinStyle: 'reunion',
      segments: [
        {
          id: 'coffee',
          label: 'Coffee',
          start: '09:00',
          end: '10:00',
          meeting: 'Synthetic test coffee',
        },
      ],
      requestId: 'runtime-plan',
    },
  });
  check('Create invitation with reunion', p.status === 201);
  const bad = await call('/plans/' + p.data.id + '/rsvp', {
    cookie: a.cookie,
    method: 'POST',
    data: { choice: 'all', status: 'joined', revision: 1 },
  });
  check('SQL trigger excludes solo portion', bad.status === 422);
  const joinR = await call('/plans/' + p.data.id + '/rsvp', {
    cookie: a.cookie,
    method: 'POST',
    data: { choice: 'coffee', status: 'joined', revision: 1 },
  });
  check('SQL trigger accepts the coffee part', joinR.status === 200);
  const photo = await call('/photos', {
    cookie: a.cookie,
    method: 'POST',
    data: {
      data:
        'data:image/jpeg;base64,' +
        (await readFile(resolve(ROOT, 'public/assets/concrete.jpg'))).toString(
          'base64',
        ),
    },
  });
  check('Photograph written to local R2', photo.status === 201);
  const note = await call('/moments', {
    cookie: a.cookie,
    method: 'POST',
    data: {
      title: 'Runtime memory',
      text: 'Test contribution, not a travel memory',
      date: '2026-10-04',
      region: 'osaka',
      photos: [photo.data.id],
      requestId: 'runtime-note',
    },
  });
  check('Memory defaults shared', note.status === 201);
  const state = await call('/state', { cookie: owner.cookie });
  check(
    'Other member receives shared memory',
    state.data.moments[0].visibility === 'group',
  );
  const image = await fetch(base + '/api/photos/' + photo.data.id, {
    headers: { Cookie: owner.cookie },
  });
  check(
    'Authenticated R2 photo round trip',
    image.ok && (await image.arrayBuffer()).byteLength > 0,
  );
  const sync = await call('/sync?after=' + state.data.seq, {
    cookie: owner.cookie,
  });
  check('No-change sync uses an empty 204', sync.status === 204);
  const asset = await fetch(base + '/');
  check(
    'Static asset binding serves the interface',
    asset.ok && (await asset.text()).includes('Adventure Omakase'),
  );
  report.passed = report.checks.length;
  report.status = 'PASS';
  console.log(
    `Native local Cloudflare runtime: ${report.passed} checks passed.`,
  );
} catch (e) {
  report.status = e.message.includes('Wrangler is not installed')
    ? 'BLOCKED'
    : 'FAIL';
  report.error = e.message;
  console.error(e.message);
  process.exitCode = 1;
} finally {
  if (proc) {
    proc.kill('SIGTERM');
    await sleep(500);
    if (proc.exitCode === null) proc.kill('SIGKILL');
  }
  await mkdir(resolve(ROOT, 'evidence'), { recursive: true });
  await writeFile(
    resolve(ROOT, 'evidence/runtime-smoke.json'),
    JSON.stringify(report, null, 2),
  );
  await rm(dir, { recursive: true, force: true });
}
