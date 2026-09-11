/** Deployment/operator utilities. Never print Cloudflare credentials or setup keys. */
import { readFile, writeFile, mkdir, chmod, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const hash = (b) => createHash('sha256').update(b).digest('hex');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function loadJSON(path) {
  const text = await readFile(resolve(ROOT, path), 'utf8');
  if (path.endsWith('.jsonc')) {
    const parsed = ts.parseConfigFileTextToJson(path, text);
    if (parsed.error) throw Error('Invalid JSONC configuration: ' + path);
    return parsed.config;
  }
  return JSON.parse(text);
}
export async function privateJSON(path, value) {
  const full = resolve(ROOT, path);
  await mkdir(dirname(full), { recursive: true, mode: 0o700 });
  await writeFile(full, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await chmod(full, 0o600);
}
export async function command(
  executable,
  args,
  { capture = false, input, env = {} } = {},
) {
  return await new Promise((ok, no) => {
    const p = spawn(executable, args, {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false', ...env },
      stdio: [
        input !== undefined ? 'pipe' : 'inherit',
        capture ? 'pipe' : 'inherit',
        capture ? 'pipe' : 'inherit',
      ],
    });
    let out = '',
      err = '';
    if (capture) {
      p.stdout.on('data', (b) => (out += b));
      p.stderr.on('data', (b) => (err += b));
    }
    if (input !== undefined) p.stdin.end(input);
    p.on('error', no);
    p.on('exit', (c) =>
      c === 0
        ? ok(out)
        : no(
            Object.assign(
              Error(
                `Command failed (${c}): ${args.slice(0, 3).join(' ')}. See the local command output; no resources were deleted.`,
              ),
              { exitCode: c, diagnostic: err },
            ),
          ),
    );
  });
}
export async function wrangler(args, opts = {}) {
  const entry = resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js');
  try {
    await access(entry);
  } catch {
    throw Error('Run pnpm install first. Wrangler is not installed.');
  }
  let account = {};
  try {
    const cfg = await loadJSON('wrangler.jsonc');
    if (cfg.account_id) account = { CLOUDFLARE_ACCOUNT_ID: cfg.account_id };
  } catch {
    /* Best-effort fallback; canonical server state is unchanged. */
  }
  return command(process.execPath, [entry, ...args], {
    ...opts,
    env: { ...account, ...(opts.env || {}) },
  });
}
export async function npm(args) {
  return command(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args);
}
export async function cloudflareAuth({ login = false } = {}) {
  let raw;
  try {
    raw = await wrangler(['auth', 'token', '--json'], { capture: true });
  } catch {
    if (!login)
      throw Error(
        'Authenticate locally with npx wrangler login. Do not paste API credentials into chat.',
      );
    await wrangler(['login']);
    raw = await wrangler(['auth', 'token', '--json'], { capture: true });
  }
  // Wrangler's --json suppresses banners. Treat unexpected output as an error, never echo it.
  let d;
  try {
    d = JSON.parse(raw.trim());
  } catch {
    throw Error(
      'Wrangler did not return JSON credentials. Update Wrangler and retry; credentials were not printed.',
    );
  }
  if (d.token) return { Authorization: `Bearer ${d.token}` };
  if (d.type === 'api_key' && d.key && d.email)
    return { 'X-Auth-Key': d.key, 'X-Auth-Email': d.email };
  throw Error('No usable Wrangler authentication was found.');
}
export async function cf(headers, path, method = 'GET', data) {
  const r = await fetch('https://api.cloudflare.com/client/v4' + path, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false)
    throw Error(
      `Cloudflare ${method} ${path}: ${(j.errors || []).map((e) => e.message).join('; ') || r.status}. Nothing else is automatically deleted or replaced.`,
    );
  return j.result;
}
export async function operator() {
  let d;
  try {
    d = await loadJSON(
      `.deploy/${process.env.OMAKASE_ENV || 'unselected'}/operator.json`,
    );
  } catch {
    d = {};
  }
  const url = process.env.OMAKASE_URL || d.url,
    key = process.env.OMAKASE_SETUP_KEY || d.setupKey;
  if (!url || !key)
    throw Error(
      'Missing local operator configuration. Run cloudflare:setup, or set OMAKASE_URL and OMAKASE_SETUP_KEY in your local environment.',
    );
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.hostname !== '127.0.0.1')
    throw Error('Use HTTPS for a deployed app.');
  return { ...d, recordedUrl: d.url, url: u.origin, key };
}
export async function admin(
  op,
  path,
  method = 'GET',
  body,
  contentType = 'application/json',
) {
  const r = await fetch(op.url + '/api/admin' + path, {
    method,
    headers: {
      'X-Setup-Key': op.key,
      'X-Omakase': '1',
      'Content-Type': contentType,
    },
    body:
      body === undefined
        ? undefined
        : typeof body === 'string' || body instanceof Uint8Array
          ? body
          : JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Error(
      `Operator request ${path} failed (${r.status}): ${j.detail || 'No details'}`,
    );
  }
  return r;
}
export async function health(url, timeout = 60000, release) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      const r = await fetch(url + '/api/health', {
        signal: AbortSignal.timeout(6000),
      });
      const j = await r.json();
      if (
        r.ok &&
        j.ok &&
        j.platform === 'cloudflare' &&
        (!release || j.release === release)
      )
        return j;
      last = j;
    } catch (e) {
      last = e.message;
    }
    await sleep(1500);
  }
  throw Error(
    'Deployment did not become healthy. Check Wrangler logs before inviting friends. ' +
      JSON.stringify(last),
  );
}
export async function writeLaunch(op, { deviceKey } = {}) {
  const url =
    op.url +
    (deviceKey
      ? '#device=' + encodeURIComponent(deviceKey)
      : '#setup=' + encodeURIComponent(op.setupKey || op.key));
  const html =
    '<!doctype html><meta charset="utf-8"><title>Open your Adventure Omakase</title><style>body{font:18px/1.6 system-ui;background:#f8f5ee;color:#29352d;max-width:650px;margin:12vh auto;padding:24px}a{display:inline-block;padding:16px 22px;color:white;background:#923f2d;border-radius:8px}small{display:block;margin-top:28px}</style><h1>Your Japan fieldbook is ready to open.</h1><p>This local launch file is for the trip owner. After opening the app, use <b>Invite friends</b> to get the group link.</p><a href="' +
    url +
    '">Open our trip →</a><small>Keep this file and .deploy/operator.json on your own computer. They are not the group invitation.</small>';
  const file = resolve(ROOT, `.deploy/${op.environment}/OPEN_MY_TRIP.html`);
  await writeFile(file, html, { mode: 0o600 });
  console.log(
    'App address: ' +
      op.url +
      '\nOpen the private .deploy environment folder to finish setup. Do not send the owner launch file to friends.',
  );
}
