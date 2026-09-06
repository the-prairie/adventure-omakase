import { catalogue } from './catalogue.js';
import type { Env, Context, Database, Statement, Row } from './platform.js';

/** Cloudflare-native friends' trip. No local files, server timers or global state.
 * SQL guards and D1 batches enforce capacity, stale versions and idempotency.
 * Cloudflare auth and API keys never reach a friend's browser.
 */
const VERSION = '3.0.0',
  COOKIE = 'omakase_friends',
  SESSION_SECONDS = 180 * 86400;
const REGIONS = ['tokyo', 'osaka', 'okinawa', 'elsewhere'];
const now = () => new Date().toISOString(),
  epoch = () => Math.floor(Date.now() / 1000);
const uid = () => crypto.randomUUID().replace(/-/g, '');
const secret = () => {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};
const digest = async (s: string | ArrayBuffer) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        typeof s === 'string' ? new TextEncoder().encode(s) : s,
      ),
    ),
    (v) => v.toString(16).padStart(2, '0'),
  ).join('');
class HttpError extends Error {
  constructor(
    public status: number,
    public detail: string | Row,
  ) {
    super(typeof detail === 'string' ? detail : detail.message);
  }
}
function fail(status: number, message: string | Row): never {
  throw new HttpError(status, message);
}
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
const stmt = (db: Database, sql: string, ...v: unknown[]) =>
  db.prepare(sql).bind(...v);
async function one(
  db: Database,
  sql: string,
  ...v: unknown[]
): Promise<Row | null> {
  return stmt(db, sql, ...v).first<Row>();
}
async function rows(
  db: Database,
  sql: string,
  ...v: unknown[]
): Promise<Row[]> {
  return (await stmt(db, sql, ...v).all<Row>()).results;
}
function txt(
  d: Row,
  key: string,
  max = 500,
  required = false,
  def = '',
): string {
  const v = d[key] ?? def;
  if (typeof v !== 'string' || v.length > max)
    fail(422, `${key}: use text up to ${max} characters.`);
  const s = v.trim();
  if (required && !s) fail(422, `${key} is required.`);
  return s;
}
function choice(d: Row, key: string, values: string[], def: string): string {
  const v = d[key] ?? def;
  if (!values.includes(v)) fail(422, `Choose a valid ${key}.`);
  return v;
}
function integer(
  d: Row,
  key: string,
  min: number,
  max: number,
  def?: number,
): number {
  const v = d[key] ?? def;
  if (!Number.isInteger(v) || v < min || v > max)
    fail(422, `${key}: choose a number from ${min} to ${max}.`);
  return v;
}
function date(v: unknown, trip?: Row): string {
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    isNaN(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    fail(422, 'Use a real calendar date.');
  if (trip && (v < trip.start || v > trip.end))
    fail(422, `Choose a trip date between ${trip.start} and ${trip.end}.`);
  return v;
}
function clock(v: unknown): string {
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
    fail(422, 'Use a 24-hour Japan time (HH:MM).');
  return v;
}
function link(v: string): string {
  if (!v) return '';
  try {
    const u = new URL(v);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
      throw Error();
    return u.href;
  } catch {
    fail(422, 'Use an ordinary http or https link.');
  }
}
async function boundedBody(request: Request, max: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') || 0) > max)
    fail(413, 'That upload is too large.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        fail(413, 'That request is too large.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(size);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
async function body(r: Request, max = 160_000): Promise<Row> {
  const raw = await boundedBody(r, max);
  try {
    const d = JSON.parse(new TextDecoder().decode(raw));
    if (!d || Array.isArray(d) || typeof d !== 'object') throw Error();
    return d;
  } catch {
    fail(400, 'Send a valid JSON object.');
  }
}
function cookie(r: Request): string {
  return (
    (r.headers.get('cookie') || '')
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(COOKIE + '='))
      ?.slice(COOKIE.length + 1) || ''
  );
}
function sessionHeader(
  r: Request,
  token: string,
  seconds = SESSION_SECONDS,
): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(r.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function auth(r: Request, env: Env): Promise<Row> {
  const m = await one(
    env.DB,
    'SELECT m.* FROM members m JOIN sessions s ON s.member_id=m.id WHERE s.token_hash=? AND s.expires>? AND m.active=1',
    await digest(cookie(r)),
    epoch(),
  );
  if (!m) fail(401, 'Open your friends’ invitation to join this trip.');
  return m;
}
function publicMember(m: Row) {
  return {
    id: m.id,
    name: m.name,
    role: m.role,
    active: !!m.active,
    profile: JSON.parse(m.profile),
  };
}
function publicTrip(t: Row) {
  return {
    id: t.id,
    name: t.name,
    start: t.start,
    end: t.end,
    created: t.created,
  };
}
function change(
  db: Database,
  m: Row,
  kind: string,
  entity: string,
  summary: string,
  audience = 'group',
  conditional = true,
): Statement {
  return stmt(
    db,
    `INSERT INTO changes(trip_id,actor,kind,entity,summary,audience,created) SELECT ?,?,?,?,?,?,? ${conditional ? 'WHERE changes()>0' : ''}`,
    m.trip_id,
    m.id,
    kind,
    entity,
    summary,
    audience,
    now(),
  );
}
async function write(
  env: Env,
  m: Row,
  s: Statement,
  kind: string,
  entity: string,
  summary: string,
  audience = 'group',
) {
  return (
    await env.DB.batch([s, change(env.DB, m, kind, entity, summary, audience)])
  )[0];
}
async function limited(env: Env, key: string, max: number, seconds = 60) {
  const bucket = Math.floor(epoch() / seconds),
    k = `${key}:${bucket}`;
  const r = await one(
    env.DB,
    'INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
    k,
    (bucket + 1) * seconds,
  );
  if (r!.count > max)
    fail(429, 'A lot arrived at once. Give it a moment and try again.');
}
async function ownerKey(r: Request, env: Env) {
  const supplied = r.headers.get('x-setup-key') || '';
  if (
    !env.SETUP_KEY ||
    env.SETUP_KEY.length < 24 ||
    (await digest(supplied)) !== (await digest(env.SETUP_KEY))
  )
    fail(403, 'An administrator credential is required.');
}
async function plan(env: Env, pid: string, m: Row): Promise<Row> {
  const p = await one(
    env.DB,
    'SELECT * FROM plans WHERE id=? AND trip_id=?',
    pid,
    m.trip_id,
  );
  if (!p) fail(404, 'That invitation is not in this trip.');
  return p;
}
async function snapshot(env: Env, m: Row): Promise<Row> {
  // One batch provides a coherent view and avoids one query per card.
  const queries = [
    stmt(env.DB, 'SELECT * FROM trips WHERE id=?', m.trip_id),
    stmt(
      env.DB,
      'SELECT * FROM members WHERE trip_id=? ORDER BY created,id',
      m.trip_id,
    ),
    stmt(
      env.DB,
      'SELECT * FROM plans WHERE trip_id=? ORDER BY created DESC',
      m.trip_id,
    ),
    stmt(
      env.DB,
      'SELECT r.* FROM rsvps r JOIN plans p ON p.id=r.plan_id JOIN members m ON m.id=r.member_id WHERE p.trip_id=? AND m.active=1',
      m.trip_id,
    ),
    stmt(
      env.DB,
      'SELECT c.* FROM comments c JOIN plans p ON p.id=c.plan_id WHERE p.trip_id=? AND c.deleted=0 ORDER BY c.created,c.id',
      m.trip_id,
    ),
    stmt(
      env.DB,
      "SELECT * FROM moments WHERE trip_id=? AND (visibility='group' OR member_id=?) AND (deleted=0 OR updated>?) ORDER BY created DESC",
      m.trip_id,
      m.id,
      new Date(Date.now() - 7 * 86400000).toISOString(),
    ),
    stmt(
      env.DB,
      'SELECT p.member_id AS memberId,p.catalogue_id AS catalogueId,p.shared FROM picks p JOIN members m ON m.id=p.member_id WHERE m.trip_id=? AND m.active=1 AND (p.shared=1 OR p.member_id=?)',
      m.trip_id,
      m.id,
    ),
    stmt(
      env.DB,
      "SELECT seq,actor,kind,entity,summary,created FROM changes WHERE trip_id=? AND (audience='group' OR audience=?) ORDER BY seq DESC LIMIT 100",
      m.trip_id,
      m.id,
    ),
    stmt(
      env.DB,
      'SELECT coalesce(max(seq),0) AS seq FROM changes WHERE trip_id=?',
      m.trip_id,
    ),
    stmt(
      env.DB,
      'SELECT * FROM discoveries WHERE trip_id=? AND deleted=0 ORDER BY created DESC',
      m.trip_id,
    ),
  ];
  const res = (await env.DB.batch<Row>(queries)).map((v) => v.results);
  const members = res[1].map(publicMember),
    me = members.find((x) => x.id === m.id);
  const plans = res[2].map((p) => ({
    ...JSON.parse(p.body),
    id: p.id,
    hostId: p.host_id,
    revision: p.revision,
    status: p.status,
    created: p.created,
    updated: p.updated,
    rsvps: res[3]
      .filter((r) => r.plan_id === p.id)
      .map((r) => ({
        memberId: r.member_id,
        choice: r.choice,
        status: r.status,
        acceptedRevision: r.accepted_revision,
        updated: r.updated,
      })),
    comments: res[4]
      .filter((r) => r.plan_id === p.id)
      .map((r) => ({
        id: r.id,
        memberId: r.member_id,
        text: r.text,
        created: r.created,
      })),
  }));
  const memories = res[5].map((r) => ({
    ...JSON.parse(r.body),
    id: r.id,
    memberId: r.member_id,
    visibility: r.visibility,
    revision: r.revision,
    deleted: !!r.deleted,
    created: r.created,
    updated: r.updated,
  }));
  return {
    trip: publicTrip(res[0][0]),
    me,
    members,
    plans,
    moments: memories.filter((r) => !r.deleted),
    trash: memories.filter((r) => r.deleted),
    picks: res[6],
    changes: res[7],
    seq: res[8][0].seq,
    readSeq: res[1].find((r) => r.id === m.id)?.read_seq || 0,
    discoveries: res[9].map((r) => ({
      ...JSON.parse(r.body),
      id: r.id,
      memberId: r.member_id,
      revision: r.revision,
      custom: true,
    })),
    serverTime: now(),
    mode: 'shared',
    version: VERSION,
    syncIntervalSeconds: 20,
  };
}
async function planValue(env: Env, pid: string, m: Row): Promise<Row> {
  return (await snapshot(env, m)).plans.find((p: Row) => p.id === pid);
}
async function validateCatalogue(env: Env, m: Row, id: string, d?: string) {
  if (!id) return;
  if (catalogue[id]) {
    const a = catalogue[id];
    if (d && a.start && (d < a.start || d > (a.end || a.start)))
      fail(
        422,
        'That dated discovery falls outside its listed event window. Check its source.',
      );
    return;
  }
  if (
    !(await one(
      env.DB,
      'SELECT id FROM discoveries WHERE id=? AND trip_id=? AND deleted=0',
      id,
      m.trip_id,
    ))
  )
    fail(422, 'That discovery is not in this trip.');
}
async function cleanPlan(env: Env, m: Row, d: Row): Promise<Row> {
  const t = await one(env.DB, 'SELECT * FROM trips WHERE id=?', m.trip_id);
  const p: Row = {
    title: txt(d, 'title', 150, true),
    region: choice(d, 'region', REGIONS, 'tokyo'),
    area: txt(d, 'area', 100, true),
    date: date(d.date, t!),
    start: clock(d.start),
    end: clock(d.end),
    meeting: txt(d, 'meeting', 500, true),
    mapLink: link(txt(d, 'mapLink', 2000)),
    description: txt(d, 'description', 3000),
    cost: txt(d, 'cost', 160),
    booking: choice(
      d,
      'booking',
      ['check', 'not-needed', 'host-booked'],
      'check',
    ),
    kind: choice(d, 'kind', ['going', 'idea'], 'going'),
    effort: choice(d, 'effort', ['easy', 'active', 'demanding'], 'easy'),
    catalogueId: txt(d, 'catalogueId', 60),
    joinStyle: choice(d, 'joinStyle', ['open', 'reunion'], 'open'),
  };
  if (p.end <= p.start)
    fail(
      422,
      'End after the start on the same Japan calendar day. Split overnight plans into separate invitations.',
    );
  await validateCatalogue(env, m, p.catalogueId, p.date);
  p.capacity = [null, undefined, '', 0].includes(d.capacity)
    ? null
    : integer(d, 'capacity', 2, 60);
  if (!Array.isArray(d.segments ?? []) || (d.segments || []).length > 5)
    fail(422, 'Add up to five meeting options.');
  const ids = new Set<string>();
  p.segments = (d.segments || []).map((s: Row) => {
    if (!s || typeof s !== 'object') fail(422, 'Invalid meeting option.');
    const id = s.id || uid();
    if (
      typeof id !== 'string' ||
      !/^[-\w]{1,60}$/.test(id) ||
      id === 'all' ||
      ids.has(id)
    )
      fail(422, 'Meeting option IDs must be unique.');
    ids.add(id);
    const seg = {
      id,
      label: txt(s, 'label', 100, true),
      start: clock(s.start),
      end: clock(s.end),
      meeting: txt(s, 'meeting', 500, true),
    };
    if (seg.start < p.start || seg.end > p.end || seg.start >= seg.end)
      fail(422, 'Meeting options must fit inside the outing’s time.');
    return seg;
  });
  if (p.joinStyle === 'reunion' && !p.segments.length)
    fail(422, 'Add a meet-afterward option for a solo-first plan.');
  return p;
}
async function cleanMoment(env: Env, m: Row, d: Row): Promise<Row> {
  const photos = d.photos || [];
  if (
    !Array.isArray(photos) ||
    photos.length > 3 ||
    !photos.every((p: unknown) => typeof p === 'string')
  )
    fail(422, 'Choose up to three photos.');
  for (const id of photos)
    if (
      !(await one(
        env.DB,
        "SELECT id FROM photos WHERE id=? AND trip_id=? AND member_id=? AND status='ready'",
        id,
        m.trip_id,
        m.id,
      ))
    )
      fail(422, 'A selected photo did not finish uploading.');
  const planId = txt(d, 'planId', 60);
  if (planId) await plan(env, planId, m);
  return {
    title: txt(d, 'title', 150),
    text: txt(d, 'text', 5000, true),
    date: date(d.date),
    region: choice(d, 'region', REGIONS, 'tokyo'),
    planId,
    photos: [...new Set(photos)],
  };
}

/** Strip metadata even for direct API uploads. Browser canvas already normalizes
 * orientation/resolution. Reject oversized dimensions, truncated and non-JPEG input.
 * Scan bytes remain compressed; no expensive image decode in the Worker.
 */
export function sanitizeJpeg(input: Uint8Array): Uint8Array {
  if (input.length < 16 || input[0] !== 255 || input[1] !== 216)
    fail(422, 'Upload a resized JPEG photograph.');
  const chunks: Uint8Array[] = [input.subarray(0, 2)];
  let pos = 2,
    frame = false,
    scan = false;
  while (pos < input.length) {
    if (input[pos] !== 255) fail(422, 'Invalid JPEG structure.');
    const begin = pos++;
    while (input[pos] === 255) pos++;
    const marker = input[pos++];
    if (marker === 217) {
      chunks.push(input.subarray(begin, pos));
      break;
    }
    if (marker === 218) {
      const len = (input[pos] << 8) | input[pos + 1];
      if (
        len < 2 ||
        pos + len > input.length ||
        input[input.length - 2] !== 255 ||
        input[input.length - 1] !== 217
      )
        fail(422, 'Incomplete JPEG.');
      chunks.push(input.subarray(begin));
      scan = true;
      break;
    }
    if (pos + 2 > input.length) fail(422, 'Incomplete JPEG.');
    const len = (input[pos] << 8) | input[pos + 1];
    if (len < 2 || pos + len > input.length) fail(422, 'Incomplete JPEG.');
    if ([192, 193, 194].includes(marker)) {
      if (len < 8) fail(422, 'Invalid photo dimensions.');
      const h = (input[pos + 3] << 8) | input[pos + 4],
        w = (input[pos + 5] << 8) | input[pos + 6];
      if (!h || !w || w > 1920 || h > 1920)
        fail(422, 'Resize this photo to at most 1920 pixels before upload.');
      frame = true;
    }
    // Remove EXIF, XMP, ICC, Photoshop and comments. Retain JFIF and coding tables.
    if (!(marker >= 225 && marker <= 239) && marker !== 254)
      chunks.push(input.subarray(begin, pos + len));
    pos += len;
  }
  if (!frame || !scan) fail(422, 'Use a complete JPEG photograph.');
  const result = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

async function routes(
  request: Request,
  env: Env,
  _ctx: Context,
): Promise<Response> {
  const u = new URL(request.url),
    path = u.pathname,
    method = request.method,
    db = env.DB;
  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (path === '/api/health' && method === 'GET') {
    const meta = await one(db, "SELECT value FROM app_meta WHERE key='schema'");
    return json({
      ok: meta?.value === '3',
      version: VERSION,
      release: env.RELEASE_SHA || 'development',
      workerVersion: env.CF_VERSION?.id || null,
      mode: 'shared',
      platform: 'cloudflare',
      timezone: 'Asia/Tokyo',
      sync: 'visible-tab-polling',
      setupRequired: !(await one(db, 'SELECT id FROM trips LIMIT 1')),
    });
  }
  if (env.MAINTENANCE === '1' && !path.startsWith('/api/admin/'))
    fail(503, 'The trip is being restored. Try again shortly.');
  const writing = !['GET', 'HEAD'].includes(method);
  if (writing) {
    const clientRelease = request.headers.get('x-omakase-release');
    if (clientRelease && clientRelease !== (env.RELEASE_SHA || 'development'))
      fail(
        409,
        'A new edition is ready. Reload this page before making changes; keep your unsent draft.',
      );
    if (
      request.headers.get('x-omakase') !== '1' ||
      (request.headers.get('origin') &&
        request.headers.get('origin') !== u.origin)
    )
      fail(403, 'Open the trip app to make this change.');
  }
  if (path === '/api/trips' && method === 'POST') {
    const d = await body(request);
    if (
      !env.SETUP_KEY ||
      env.SETUP_KEY.length < 24 ||
      (await digest(txt(d, 'hostKey', 200))) !== (await digest(env.SETUP_KEY))
    )
      fail(403, 'Use the setup link saved by the deployment script.');
    if (await one(db, 'SELECT id FROM trips LIMIT 1'))
      fail(409, 'This trip already exists. Use its invitation link.');
    const mid = uid(),
      tid = uid(),
      invite = secret(),
      token = secret(),
      m = { id: mid, trip_id: tid };
    const title = txt(d, 'title', 100, false, 'Japan, slightly off script'),
      name = txt(d, 'name', 50, true);
    await db.batch([
      stmt(
        db,
        'INSERT INTO trips(id,name,start,end,invite_token,created) VALUES(?,?,?,?,?,?)',
        tid,
        title,
        '2026-09-26',
        '2026-10-14',
        invite,
        now(),
      ),
      stmt(
        db,
        "INSERT INTO members(id,trip_id,name,role,created) VALUES(?,?,?,'owner',?)",
        mid,
        tid,
        name,
        now(),
      ),
      stmt(
        db,
        'INSERT INTO sessions VALUES(?,?,?)',
        await digest(token),
        mid,
        epoch() + SESSION_SECONDS,
      ),
      change(db, m, 'trip-created', tid, 'opened the trip', 'group', false),
    ]);
    return json(
      await snapshot(
        env,
        (await one(db, 'SELECT * FROM members WHERE id=?', mid))!,
      ),
      201,
      { 'Set-Cookie': sessionHeader(request, token) },
    );
  }
  if (path === '/api/join' && method === 'POST') {
    const d = await body(request);
    await limited(
      env,
      'join:' +
        (await digest(request.headers.get('cf-connecting-ip') || 'local')),
      60,
      3600,
    );
    const token = txt(d, 'token', 150, true),
      name = txt(d, 'name', 50, true),
      t = await one(db, 'SELECT * FROM trips WHERE invite_token=?', token);
    if (!t)
      fail(
        403,
        'That link has been replaced. Ask a friend for the current invitation.',
      );
    try {
      const existing = await auth(request, env);
      if (existing.trip_id === t.id) return json(await snapshot(env, existing));
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 401)) throw e;
    }
    const mid = uid(),
      session = secret();
    const res = await db.batch([
      stmt(
        db,
        "INSERT INTO members(id,trip_id,name,role,created) SELECT ?,id,?,'member',? FROM trips WHERE id=? AND invite_token=? RETURNING id",
        mid,
        name,
        now(),
        t.id,
        token,
      ),
      stmt(
        db,
        'INSERT INTO sessions SELECT ?,id,? FROM members WHERE id=?',
        await digest(session),
        epoch() + SESSION_SECONDS,
        mid,
      ),
      stmt(
        db,
        "INSERT INTO changes(trip_id,actor,kind,entity,summary,created) SELECT trip_id,id,'member-joined',id,'came along',? FROM members WHERE id=?",
        now(),
        mid,
      ),
    ]);
    if (!res[0].results.length)
      fail(403, 'The invitation just changed. Ask for the latest link.');
    return json(
      await snapshot(
        env,
        (await one(db, 'SELECT * FROM members WHERE id=?', mid))!,
      ),
      201,
      { 'Set-Cookie': sessionHeader(request, session) },
    );
  }
  if (path === '/api/recover' && method === 'POST') {
    const d = await body(request);
    await limited(
      env,
      'recover:' +
        (await digest(request.headers.get('cf-connecting-ip') || 'local')),
      30,
      3600,
    );
    const m = await one(
      db,
      'SELECT * FROM members WHERE active=1 AND recovery_hash=?',
      await digest(txt(d, 'key', 150, true)),
    );
    if (!m) fail(403, 'That personal device link is no longer valid.');
    const token = secret();
    await stmt(
      db,
      'INSERT INTO sessions VALUES(?,?,?)',
      await digest(token),
      m.id,
      epoch() + SESSION_SECONDS,
    ).run();
    return json(await snapshot(env, m), 200, {
      'Set-Cookie': sessionHeader(request, token),
    });
  }
  if (path.startsWith('/api/admin/')) return admin(request, env);
  const m = await auth(request, env);
  if (method === 'GET' && path === '/api/state')
    return json(await snapshot(env, m));
  if (method === 'GET' && path === '/api/sync') {
    const seq = (await one(
      db,
      'SELECT coalesce(max(seq),0) AS seq FROM changes WHERE trip_id=?',
      m.trip_id,
    ))!.seq;
    if (String(seq) === u.searchParams.get('after'))
      return new Response(null, {
        status: 204,
        headers: {
          'Cache-Control': 'no-store',
          'X-Omakase-Release': env.RELEASE_SHA || 'development',
        },
      });
    return json(await snapshot(env, m));
  }
  if (writing) await limited(env, 'write:' + m.id, 100);
  if (path === '/api/logout' && method === 'POST') {
    await stmt(
      db,
      'DELETE FROM sessions WHERE token_hash=?',
      await digest(cookie(request)),
    ).run();
    return json({ ok: true }, 200, {
      'Set-Cookie': sessionHeader(request, '', 0),
    });
  }
  if (path === '/api/invite' && method === 'GET') {
    const t = (await one(db, 'SELECT * FROM trips WHERE id=?', m.trip_id))!;
    return json({
      token: t.invite_token,
      version: t.invite_version,
      name: t.name,
    });
  }
  if (path === '/api/invite/rotate' && method === 'POST') {
    if (m.role !== 'owner')
      fail(403, 'Only the trip owner can replace the group link.');
    const token = secret();
    await write(
      env,
      m,
      stmt(
        db,
        'UPDATE trips SET invite_token=?,invite_version=invite_version+1 WHERE id=?',
        token,
        m.trip_id,
      ),
      'invite-rotated',
      m.trip_id,
      'replaced the group invitation link',
    );
    return json({ token });
  }
  if (path === '/api/device-link' && method === 'POST') {
    const d = await body(request);
    let mid = m.id;
    if (d.memberId && d.memberId !== m.id) {
      if (m.role !== 'owner')
        fail(403, 'Only the owner can help another friend back in.');
      if (
        !(await one(
          db,
          'SELECT id FROM members WHERE id=? AND trip_id=? AND active=1',
          d.memberId,
          m.trip_id,
        ))
      )
        fail(404, 'Friend not found.');
      mid = d.memberId;
    }
    const key = secret();
    await stmt(
      db,
      'UPDATE members SET recovery_hash=? WHERE id=?',
      await digest(key),
      mid,
    ).run();
    return json({ key, memberId: mid });
  }
  if (path === '/api/profile' && method === 'PUT') {
    const d = await body(request),
      windows = d.windows ?? [];
    if (!Array.isArray(windows) || windows.length > 12)
      fail(422, 'Use up to 12 travel windows.');
    const clean = windows.map((w: Row) => {
      const from = date(w.from),
        to = date(w.to);
      if (to < from) fail(422, 'Departure is before arrival.');
      return {
        region: choice(w, 'region', REGIONS, 'tokyo'),
        area: txt(w, 'area', 100),
        from,
        to,
      };
    });
    await write(
      env,
      m,
      stmt(
        db,
        'UPDATE members SET name=?,profile=? WHERE id=?',
        txt(d, 'name', 50, true),
        JSON.stringify({
          bio: txt(d, 'bio', 300),
          interests: txt(d, 'interests', 200),
          windows: clean,
        }),
        m.id,
      ),
      'profile',
      m.id,
      'updated their travel dates',
    );
    return json({ ok: true });
  }
  let match: RegExpMatchArray | null;
  if (
    (match = path.match(/^\/api\/members\/([-\w]+)$/)) &&
    method === 'DELETE'
  ) {
    if (m.role !== 'owner' || match[1] === m.id)
      fail(403, 'The owner can remove another trip member.');
    const member = await one(
      db,
      'SELECT * FROM members WHERE id=? AND trip_id=?',
      match[1],
      m.trip_id,
    );
    if (!member) fail(404, 'Friend not found.');
    await db.batch([
      stmt(
        db,
        'UPDATE members SET active=0,recovery_hash=NULL WHERE id=?',
        member.id,
      ),
      stmt(db, 'DELETE FROM sessions WHERE member_id=?', member.id),
      stmt(
        db,
        "UPDATE plans SET status='cancelled',revision=revision+1,updated=? WHERE host_id=? AND status='open'",
        now(),
        member.id,
      ),
      change(
        db,
        m,
        'member-removed',
        member.id,
        'removed ' + member.name,
        'group',
        false,
      ),
    ]);
    return json({ ok: true });
  }
  if (path === '/api/plans' && method === 'POST') {
    const d = await body(request),
      p = await cleanPlan(env, m, d),
      pid = uid(),
      rid = txt(d, 'requestId', 100) || uid();
    if (
      (await one(
        db,
        'SELECT count(*) AS n FROM plans WHERE trip_id=?',
        m.trip_id,
      ))!.n >= 1000
    )
      fail(409, 'This trip has 1,000 invitations.');
    await write(
      env,
      m,
      stmt(
        db,
        'INSERT INTO plans(id,trip_id,host_id,body,request_id,created,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(host_id,request_id) DO NOTHING',
        pid,
        m.trip_id,
        m.id,
        JSON.stringify(p),
        rid,
        now(),
        now(),
      ),
      'plan-created',
      pid,
      'opened an invitation: ' + p.title,
    );
    const saved = await one(
      db,
      'SELECT id FROM plans WHERE host_id=? AND request_id=?',
      m.id,
      rid,
    );
    return json(await planValue(env, saved!.id, m), 201);
  }
  if ((match = path.match(/^\/api\/plans\/([-\w]+)$/)) && method === 'PUT') {
    const id = match[1],
      d = await body(request),
      old = await plan(env, id, m);
    if (old.host_id !== m.id)
      fail(403, 'Only the host can edit this invitation.');
    const p = await cleanPlan(env, m, d);
    const result = await write(
      env,
      m,
      stmt(
        db,
        "UPDATE plans SET body=?,revision=revision+1,updated=? WHERE id=? AND revision=? AND status='open' RETURNING id",
        JSON.stringify(p),
        now(),
        id,
        integer(d, 'revision', 1, 100000),
      ),
      'plan-changed',
      id,
      'changed ' + p.title + ' — joined friends should reconfirm',
    );
    if (!result.results.length)
      fail(
        409,
        'This invitation changed or closed. Reopen it; your draft has not overwritten anything.',
      );
    return json(await planValue(env, id, m));
  }
  if (
    (match = path.match(/^\/api\/plans\/([-\w]+)\/status$/)) &&
    method === 'POST'
  ) {
    const id = match[1],
      d = await body(request),
      p = await plan(env, id, m),
      status = choice(d, 'status', ['completed', 'cancelled'], 'cancelled');
    if (p.host_id !== m.id && !(m.role === 'owner' && status === 'cancelled'))
      fail(403, 'Only the host can finish the outing.');
    const r = await write(
      env,
      m,
      stmt(
        db,
        "UPDATE plans SET status=?,revision=revision+1,updated=? WHERE id=? AND revision=? AND status='open' RETURNING id",
        status,
        now(),
        id,
        integer(d, 'revision', 1, 100000),
      ),
      'plan-' + status,
      id,
      status + ' ' + JSON.parse(p.body).title,
    );
    if (!r.results.length) fail(409, 'This plan already changed or closed.');
    return json({ ok: true });
  }
  if (
    (match = path.match(/^\/api\/plans\/([-\w]+)\/rsvp$/)) &&
    method === 'POST'
  ) {
    const id = match[1],
      d = await body(request),
      p = await plan(env, id, m),
      status = choice(
        d,
        'status',
        ['joined', 'interested', 'waitlist', 'leave'],
        'joined',
      );
    if (p.host_id === m.id) fail(409, 'You are already hosting this outing.');
    if (status === 'leave') {
      await write(
        env,
        m,
        stmt(db, 'DELETE FROM rsvps WHERE plan_id=? AND member_id=?', id, m.id),
        'rsvp-left',
        id,
        'left an invitation',
      );
      return json({ ok: true });
    }
    const ch = txt(d, 'choice', 60, false, 'all'),
      revision = integer(d, 'revision', 1, 100000);
    await write(
      env,
      m,
      stmt(
        db,
        'INSERT INTO rsvps(plan_id,member_id,choice,status,accepted_revision,acknowledge_conflict,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(plan_id,member_id) DO UPDATE SET choice=excluded.choice,status=excluded.status,accepted_revision=excluded.accepted_revision,acknowledge_conflict=excluded.acknowledge_conflict,updated=excluded.updated',
        id,
        m.id,
        ch,
        status,
        revision,
        d.acknowledgeConflict === true ? 1 : 0,
        now(),
      ),
      'rsvp',
      id,
      (status === 'joined'
        ? 'joined '
        : status === 'interested'
          ? 'is interested in '
          : 'is waiting for ') + JSON.parse(p.body).title,
    );
    return json({ ok: true });
  }
  if (
    (match = path.match(/^\/api\/plans\/([-\w]+)\/comments$/)) &&
    method === 'POST'
  ) {
    const id = match[1],
      d = await body(request);
    await plan(env, id, m);
    const cid = uid(),
      rid = txt(d, 'requestId', 100) || uid();
    await write(
      env,
      m,
      stmt(
        db,
        'INSERT INTO comments(id,plan_id,member_id,text,request_id,created) VALUES(?,?,?,?,?,?) ON CONFLICT(member_id,request_id) DO NOTHING',
        cid,
        id,
        m.id,
        txt(d, 'text', 1200, true),
        rid,
        now(),
      ),
      'comment',
      id,
      'left a message on an invitation',
    );
    return json(
      {
        id: (await one(
          db,
          'SELECT id FROM comments WHERE member_id=? AND request_id=?',
          m.id,
          rid,
        ))!.id,
      },
      201,
    );
  }
  if (
    (match = path.match(/^\/api\/comments\/([-\w]+)$/)) &&
    method === 'DELETE'
  ) {
    const row = await one(
      db,
      'SELECT c.* FROM comments c JOIN plans p ON p.id=c.plan_id WHERE c.id=? AND p.trip_id=?',
      match[1],
      m.trip_id,
    );
    if (!row) fail(404, 'Message not found.');
    if (row.member_id !== m.id && m.role !== 'owner')
      fail(403, 'Only the author or trip owner can remove this.');
    await write(
      env,
      m,
      stmt(
        db,
        "UPDATE comments SET deleted=1,text='' WHERE id=? AND deleted=0",
        row.id,
      ),
      'comment-deleted',
      row.plan_id,
      'removed a message',
    );
    return json({ ok: true });
  }
  if (path === '/api/picks' && method === 'POST') {
    const d = await body(request),
      id = txt(d, 'catalogueId', 60, true);
    await validateCatalogue(env, m, id);
    const s =
      d.remove === true
        ? stmt(
            db,
            'DELETE FROM picks WHERE member_id=? AND catalogue_id=?',
            m.id,
            id,
          )
        : stmt(
            db,
            'INSERT INTO picks VALUES(?,?,?) ON CONFLICT(member_id,catalogue_id) DO UPDATE SET shared=excluded.shared',
            m.id,
            id,
            d.shared === true ? 1 : 0,
          );
    await write(
      env,
      m,
      s,
      'pick',
      id,
      d.shared ? 'recommended a discovery' : 'updated their shortlist',
      d.shared ? 'group' : m.id,
    );
    return json({ ok: true });
  }
  if (path === '/api/discoveries' && method === 'POST') {
    const d = await body(request),
      id = 'find-' + uid(),
      rid = txt(d, 'requestId', 100) || uid();
    const value = {
      title: txt(d, 'title', 150, true),
      region: choice(d, 'region', REGIONS, 'tokyo'),
      area: txt(d, 'area', 100, true),
      why: txt(d, 'why', 2000, true),
      description: txt(d, 'why', 2000, true),
      source: link(txt(d, 'source', 2000)),
      category: choice(
        d,
        'category',
        ['food', 'culture', 'nature', 'water', 'design', 'odd', 'craft'],
        'culture',
      ),
      tags: ['friends'],
      minutes: integer(d, 'minutes', 5, 1440, 60),
      researchStatus:
        'Friend recommendation — details not independently checked',
      booking: 'Check with the venue',
      custom: true,
    };
    await write(
      env,
      m,
      stmt(
        db,
        'INSERT INTO discoveries(id,trip_id,member_id,body,request_id,created,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(member_id,request_id) DO NOTHING',
        id,
        m.trip_id,
        m.id,
        JSON.stringify(value),
        rid,
        now(),
        now(),
      ),
      'discovery',
      id,
      'added a find: ' + value.title,
    );
    return json(
      {
        id: (await one(
          db,
          'SELECT id FROM discoveries WHERE member_id=? AND request_id=?',
          m.id,
          rid,
        ))!.id,
      },
      201,
    );
  }
  if (path === '/api/photos' && method === 'POST') {
    let data: Uint8Array;
    if ((request.headers.get('content-type') || '').startsWith('image/jpeg'))
      data = await boundedBody(request, 1_200_000);
    else {
      const d = await body(request, 1_650_000),
        value = txt(d, 'data', 1_640_000, true);
      if (!value.startsWith('data:image/jpeg;base64,'))
        fail(422, 'Use a resized JPEG.');
      try {
        data = Uint8Array.from(atob(value.split(',')[1]), (x) =>
          x.charCodeAt(0),
        );
      } catch {
        fail(422, 'Unreadable photo.');
      }
    }
    const bytes = sanitizeJpeg(data),
      id = uid(),
      key = `${m.trip_id}/${id}.jpg`,
      hash = await digest(bytes.buffer as ArrayBuffer);
    const budget = Number(env.TRIP_PHOTO_BUDGET_MB || 500) * 1024 * 1024;
    const reserve = await stmt(
      db,
      'INSERT INTO photos(id,trip_id,member_id,object_key,bytes,sha256,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT coalesce(sum(bytes),0) FROM photos WHERE trip_id=?) + ? <= ? RETURNING id',
      id,
      m.trip_id,
      m.id,
      key,
      bytes.length,
      hash,
      now(),
      m.trip_id,
      bytes.length,
      budget,
    ).all();
    if (!reserve.results.length)
      fail(
        409,
        'The selected-photo budget is full. Keep originals in your photo library.',
      );
    try {
      await env.PHOTOS.put(key, bytes, {
        httpMetadata: { contentType: 'image/jpeg' },
        customMetadata: { sha256: hash },
      });
      await stmt(db, "UPDATE photos SET status='ready' WHERE id=?", id).run();
    } catch (e) {
      await env.PHOTOS.delete(key).catch(() => {
        /* Best-effort cleanup or optional browser capability. */
      });
      await stmt(db, 'DELETE FROM photos WHERE id=?', id).run();
      throw e;
    }
    return json({ id, bytes: bytes.length, url: '/api/photos/' + id }, 201);
  }
  if ((match = path.match(/^\/api\/photos\/([-\w]+)$/)) && method === 'GET') {
    const p = await one(
      db,
      "SELECT * FROM photos WHERE id=? AND trip_id=? AND status='ready'",
      match[1],
      m.trip_id,
    );
    if (!p) fail(404, 'Photo not found.');
    // Legacy private notes remain private; new memories default to group sharing.
    if (
      p.member_id !== m.id &&
      !(await one(
        db,
        "SELECT 1 FROM moments j,json_each(j.body,'$.photos') a WHERE j.trip_id=? AND j.deleted=0 AND j.visibility='group' AND a.value=? LIMIT 1",
        m.trip_id,
        p.id,
      ))
    )
      fail(404, 'Photo not found.');
    const obj = await env.PHOTOS.get(p.object_key);
    if (!obj) fail(404, 'Photo file is unavailable.');
    return new Response(obj.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (path === '/api/moments' && method === 'POST') {
    const d = await body(request),
      value = await cleanMoment(env, m, d),
      id = uid(),
      rid = txt(d, 'requestId', 100) || uid(),
      visibility = choice(d, 'visibility', ['group', 'private'], 'group');
    await write(
      env,
      m,
      stmt(
        db,
        'INSERT INTO moments(id,trip_id,member_id,body,visibility,request_id,created,updated) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(member_id,request_id) DO NOTHING',
        id,
        m.trip_id,
        m.id,
        JSON.stringify(value),
        visibility,
        rid,
        now(),
        now(),
      ),
      'moment',
      id,
      'added a memory',
      visibility === 'group' ? 'group' : m.id,
    );
    return json(
      {
        id: (await one(
          db,
          'SELECT id FROM moments WHERE member_id=? AND request_id=?',
          m.id,
          rid,
        ))!.id,
      },
      201,
    );
  }
  if ((match = path.match(/^\/api\/moments\/([-\w]+)(?:\/(restore))?$/))) {
    const id = match[1],
      old = await one(
        db,
        'SELECT * FROM moments WHERE id=? AND trip_id=?',
        id,
        m.trip_id,
      );
    if (!old) fail(404, 'Memory not found.');
    if (
      old.member_id !== m.id &&
      !(m.role === 'owner' && method === 'DELETE' && old.visibility === 'group')
    )
      fail(403, 'Only the author can edit this memory.');
    if (method === 'PUT' && !match[2]) {
      const d = await body(request),
        value = await cleanMoment(env, m, d),
        visibility = choice(
          d,
          'visibility',
          ['group', 'private'],
          old.visibility,
        );
      const r = await write(
        env,
        m,
        stmt(
          db,
          'UPDATE moments SET body=?,visibility=?,revision=revision+1,updated=? WHERE id=? AND revision=? AND deleted=0 RETURNING id',
          JSON.stringify(value),
          visibility,
          now(),
          id,
          integer(d, 'revision', 1, 100000),
        ),
        'moment-edited',
        id,
        'updated a memory',
        visibility === 'group' ? 'group' : m.id,
      );
      if (!r.results.length) fail(409, 'This memory changed. Reopen it first.');
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await write(
        env,
        m,
        stmt(
          db,
          'UPDATE moments SET deleted=1,revision=revision+1,updated=? WHERE id=? AND deleted=0',
          now(),
          id,
        ),
        'moment-deleted',
        id,
        'removed a memory',
        old.visibility === 'group' ? 'group' : m.id,
      );
      return json({ ok: true, undoDays: 7 });
    }
    if (method === 'POST' && match[2]) {
      if (old.updated < new Date(Date.now() - 7 * 86400000).toISOString())
        fail(409, 'The seven-day undo window has ended.');
      await write(
        env,
        m,
        stmt(
          db,
          'UPDATE moments SET deleted=0,revision=revision+1,updated=? WHERE id=? AND deleted=1',
          now(),
          id,
        ),
        'moment-restored',
        id,
        'restored a memory',
        old.visibility === 'group' ? 'group' : m.id,
      );
      return json({ ok: true });
    }
  }
  if (path === '/api/read' && method === 'POST') {
    const d = await body(request);
    const seen = integer(d, 'seq', 0, Number.MAX_SAFE_INTEGER, 0);
    await stmt(
      db,
      'UPDATE members SET read_seq=max(read_seq,?) WHERE id=?',
      seen,
      m.id,
    ).run();
    return json({ ok: true });
  }
  if (path === '/api/import-legacy' && method === 'POST') {
    const d = await body(request, 6_500_000),
      old = d.backup;
    if (!old || old.version !== 1 || !Array.isArray(old.saved))
      fail(422, 'Choose a v1 Adventure Omakase backup.');
    const fingerprint = await digest(JSON.stringify(canonical(old)));
    if (
      await one(
        db,
        'SELECT 1 FROM imports WHERE member_id=? AND fingerprint=?',
        m.id,
        fingerprint,
      )
    )
      return json({ imported: 0, alreadyImported: true });
    const ids = [
      ...new Set<string>(
        old.saved.filter((s: unknown) => typeof s === 'string' && catalogue[s]),
      ),
    ];
    // A request race is harmless: unique import key rolls back the second batch.
    const result = await db.batch([
      stmt(db, 'INSERT INTO imports VALUES(?,?,?)', m.id, fingerprint, now()),
      stmt(
        db,
        'INSERT OR IGNORE INTO picks(member_id,catalogue_id,shared) SELECT ?,value,0 FROM json_each(?)',
        m.id,
        JSON.stringify(ids),
      ),
      change(
        db,
        m,
        'import',
        m.id,
        'brought their original shortlist',
        'group',
        false,
      ),
    ]);
    return json({
      imported: result.slice(1, -1).reduce((n, r) => n + r.meta.changes, 0),
      alreadyImported: false,
      notice:
        'Only saved discoveries imported. Old private notes remain in the original book.',
    });
  }
  if (path === '/api/export' && method === 'GET') {
    const s = await snapshot(env, m);
    return json({
      ...s,
      schemaVersion: 3,
      exportNotice:
        'A readable snapshot, not an automated restore file. Photos remain separately hosted.',
    });
  }
  fail(404, 'That action is not available.');
}
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
    );
  return v;
}

// Operator metadata backups exclude sessions; photographs stream separately, never as base64 JSON.
const BACKUP_TABLES = [
  'trips',
  'members',
  'plans',
  'rsvps',
  'comments',
  'picks',
  'discoveries',
  'photos',
  'moments',
  'changes',
  'imports',
];
async function admin(request: Request, env: Env): Promise<Response> {
  await ownerKey(request, env);
  const path = new URL(request.url).pathname,
    db = env.DB;
  if (path === '/api/admin/cleanup' && request.method === 'POST') {
    if (env.MAINTENANCE === '1') fail(409, 'Cleanup is paused during restore.');
    await cleanup(env);
    return json({ ok: true });
  }
  if (path === '/api/admin/backup' && request.method === 'GET') {
    const values = await db.batch(
      BACKUP_TABLES.map((t) => db.prepare(`SELECT * FROM ${t}`)),
    );
    return json({
      schemaVersion: 3,
      created: now(),
      tables: Object.fromEntries(
        BACKUP_TABLES.map((t, i) => [t, values[i].results]),
      ),
    });
  }
  const match = path.match(/^\/api\/admin\/photos\/([-\w]+)$/);
  if (match) {
    const p = await one(db, 'SELECT * FROM photos WHERE id=?', match[1]);
    if (!p) fail(404, 'Photo not found.');
    if (request.method === 'GET') {
      const obj = await env.PHOTOS.get(p.object_key);
      if (!obj) fail(404, 'Photo not found.');
      return new Response(obj.body, {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' },
      });
    }
    if (request.method === 'PUT') {
      if (env.MAINTENANCE !== '1')
        fail(409, 'Enable maintenance before restoring files.');
      const bytes = await boundedBody(request, 1_200_000);
      if ((await digest(bytes.buffer as ArrayBuffer)) !== p.sha256)
        fail(422, 'Restored photo checksum does not match.');
      await env.PHOTOS.put(p.object_key, bytes, {
        httpMetadata: { contentType: 'image/jpeg' },
        customMetadata: { sha256: p.sha256 },
      });
      return json({ ok: true });
    }
  }
  if (path === '/api/admin/restore' && request.method === 'POST') {
    if (env.MAINTENANCE !== '1')
      fail(409, 'Enable maintenance on the new deployment first.');
    if (await one(db, 'SELECT 1 FROM trips LIMIT 1'))
      fail(
        409,
        'Restore is allowed only into a fresh empty database. Existing data was not changed.',
      );
    const d = await body(request, 10_000_000);
    if (
      d.schemaVersion !== 3 ||
      !d.tables ||
      !Array.isArray(d.tables.trips) ||
      d.tables.trips.length !== 1
    )
      fail(422, 'Use a version 3 full backup.');
    // Column names come from the migration, never from untrusted JSON.
    const batch: Statement[] = [
      stmt(db, "INSERT OR REPLACE INTO app_meta VALUES('restoring','1')"),
    ];
    for (const t of BACKUP_TABLES) {
      const cols = (await rows(db, `PRAGMA table_info(${t})`)).map(
          (r) => r.name as string,
        ),
        items = d.tables[t] || [];
      if (!Array.isArray(items) || items.length > 10000)
        fail(422, 'Invalid backup table.');
      for (const item of items)
        batch.push(
          stmt(
            db,
            `INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`,
            ...cols.map((c) => item[c] ?? null),
          ),
        );
    }
    // A small friends' trip restore uses one transaction; refuse oversize rather than partially restore.
    if (batch.length > 34)
      fail(
        413,
        'Use the supplied restore command for this backup; it imports larger databases through D1 directly.',
      );
    const restored = batch.length - 1;
    batch.push(stmt(db, "DELETE FROM app_meta WHERE key='restoring'"));
    await db.batch(batch);
    return json({
      ok: true,
      rows: restored,
      notice:
        'Sessions were not restored. Restore every photo and verify hashes before disabling maintenance.',
    });
  }
  if (path === '/api/admin/owner-device' && request.method === 'POST') {
    const m = await one(
      db,
      "SELECT * FROM members WHERE role='owner' AND active=1 LIMIT 1",
    );
    if (!m) fail(404, 'Create or restore the trip first.');
    const key = secret();
    await stmt(
      db,
      'UPDATE members SET recovery_hash=? WHERE id=?',
      await digest(key),
      m.id,
    ).run();
    return json({ key });
  }
  fail(404, 'Operator action not found.');
}
export async function cleanup(env: Env): Promise<void> {
  const db = env.DB,
    cutoff = new Date(Date.now() - 30 * 86400000).toISOString(),
    yesterday = new Date(Date.now() - 86400000).toISOString();
  // Soft-deleted photos survive the undo window; unattached abandoned uploads expire.
  const orphan = await rows(
    db,
    "SELECT p.* FROM photos p WHERE p.created<? AND NOT EXISTS (SELECT 1 FROM moments m,json_each(m.body,'$.photos') j WHERE j.value=p.id AND (m.deleted=0 OR m.updated>?)) LIMIT 15",
    yesterday,
    cutoff,
  );
  for (const p of orphan) {
    const claimed = await one(
      db,
      "UPDATE photos SET status='deleting' WHERE id=? AND NOT EXISTS (SELECT 1 FROM moments m,json_each(m.body,'$.photos') j WHERE j.value=photos.id AND (m.deleted=0 OR m.updated>?)) RETURNING id",
      p.id,
      cutoff,
    );
    if (!claimed) continue;
    await env.PHOTOS.delete(p.object_key);
    await stmt(
      db,
      "DELETE FROM photos WHERE id=? AND status='deleting'",
      p.id,
    ).run();
  }
  await db.batch([
    stmt(db, 'DELETE FROM sessions WHERE expires<?', epoch()),
    stmt(db, 'DELETE FROM limits WHERE expires<?', epoch()),
    stmt(
      db,
      "UPDATE moments SET body='{}' WHERE deleted=1 AND updated<?",
      cutoff,
    ),
  ]);
}
function mappedError(e: unknown): Response {
  if (e instanceof HttpError) return json({ detail: e.detail }, e.status);
  const msg = String((e as Error)?.message || e),
    rules: [string, number, string | Row][] = [
      [
        'photo_unavailable',
        409,
        'A photo is no longer available. Select it again before saving.',
      ],
      [
        'active_names',
        409,
        'That name is already in the trip. Add an initial, or use your personal device link.',
      ],
      [
        'members.trip_id',
        409,
        'That name is already in the trip. Add an initial, or ask the owner for a device link.',
      ],
      ['trip_full', 409, 'This trip has reached its 60-friend limit.'],
      [
        'stale_plan',
        409,
        'The host changed or closed this invitation. Reopen it before joining.',
      ],
      [
        'plan_full',
        409,
        'This outing is full. Join its waitlist instead; no place was claimed.',
      ],
      [
        'choose_reunion',
        422,
        'They are going solo first. Choose a meet-afterward option.',
      ],
      ['missing_part', 422, 'That meeting option no longer exists.'],
      [
        'capacity_below_members',
        409,
        'Capacity cannot exclude friends already joined.',
      ],
      [
        'overlap',
        409,
        {
          code: 'overlap',
          message:
            'This overlaps another plan you host or joined. Choose a shorter part or accept the overlap.',
          plans: ['Another commitment in My day'],
        },
      ],
      ['invalid_member', 403, 'This member cannot join that outing.'],
      ['trips.singleton', 409, 'This deployment already has its trip.'],
      [
        'imports.member_id',
        409,
        'That backup was already imported. Refresh the trip.',
      ],
    ];
  for (const [key, status, detail] of rules)
    if (msg.includes(key)) return json({ detail }, status);
  // Do not include SQL, credential values or stack traces in responses.
  console.error(
    'omakase-request-failed',
    e instanceof Error ? e.name : 'UnknownError',
  );
  return json(
    { detail: 'The change could not be completed. Refresh before retrying.' },
    500,
  );
}
export default {
  async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
    let response: Response;
    try {
      response = await routes(request, env, ctx);
    } catch (e) {
      response = mappedError(e);
    }
    const headers = new Headers(response.headers);
    headers.set('X-Omakase-Release', env.RELEASE_SHA || 'development');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    if (new URL(request.url).pathname.startsWith('/api/'))
      headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event: unknown, env: Env, ctx: Context) {
    ctx.waitUntil(cleanup(env));
  },
};
