import { AskError, text } from './ask-contract.js';
import { publicURL, readPage, hashText } from './ask-research.js';
import type { Env, Row } from './platform.js';
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
const stamp = () => new Date().toISOString();
function excerpt(body: string, phrase: string) {
  const cleaned = body.replace(/\s+/g, ' ').trim();
  if (!phrase) return cleaned.slice(0, 4000);
  const at = cleaned.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
  return at < 0
    ? 'The watched phrase is not present in the readable page.'
    : cleaned.slice(Math.max(0, at - 100), at + phrase.length + 350);
}
async function checkOne(
  env: Env,
  watch: Row,
  at: Date,
  fetcher: typeof fetch = fetch,
) {
  const db = env.DB,
    lease = crypto.randomUUID(),
    time = at.toISOString();
  const claimed = await db
    .prepare(
      "UPDATE watches SET lease=?,lease_until=? WHERE id=? AND status='active' AND expires>? AND (lease_until IS NULL OR lease_until<?) AND (last_checked IS NULL OR last_checked<?) RETURNING id",
    )
    .bind(
      lease,
      new Date(at.getTime() + 120000).toISOString(),
      watch.id,
      time,
      time,
      new Date(at.getTime() - 60000).toISOString(),
    )
    .first();
  if (!claimed) return { checked: false };
  try {
    const source = await readPage(
      {
        id: watch.id,
        title: watch.title,
        source: watch.url,
        region: 'elsewhere',
        area: '',
        minutes: 0,
        why: 'Explicit website watch',
      },
      AbortSignal.timeout(15000),
      fetcher,
    );
    if (source.status !== 'read') throw new Error('Unavailable public page');
    const next = excerpt(source.text, watch.phrase),
      digest = await hashText(next),
      changed = !!watch.digest && watch.digest !== digest;
    const eventId = crypto.randomUUID();
    const result = await db.batch([
      db
        .prepare(
          "INSERT INTO watch_events(id,watch_id,member_id,summary,before_text,after_text,created) SELECT ?,id,member_id,?,?,?,? FROM watches WHERE id=? AND lease=? AND status='active' AND expires>? AND digest<>'' AND digest<>?",
        )
        .bind(
          eventId,
          'The watched page changed. Review it; this does not confirm tickets, opening or availability.',
          watch.excerpt,
          next.slice(0, 1000),
          time,
          watch.id,
          lease,
          time,
          digest,
        ),
      db
        .prepare(
          "UPDATE watches SET digest=?,excerpt=?,last_checked=?,next_check=?,failures=0,lease=NULL,lease_until=NULL WHERE id=? AND lease=? AND status='active'",
        )
        .bind(
          digest,
          next.slice(0, 1000),
          time,
          new Date(at.getTime() + 3600000).toISOString(),
          watch.id,
          lease,
        ),
    ]);
    return {
      checked: !!result[1].meta.changes,
      changed: changed && !!result[0].meta.changes,
    };
  } catch {
    await db.batch([
      db
        .prepare(
          "INSERT INTO watch_events(id,watch_id,member_id,summary,before_text,after_text,created) SELECT ?,id,member_id,'This watch paused after three failed checks. The page may need a browser or be unavailable. Review and restart when ready.','','',? FROM watches WHERE id=? AND lease=? AND status='active' AND failures=2",
        )
        .bind(crypto.randomUUID(), time, watch.id, lease),
      db
        .prepare(
          "UPDATE watches SET failures=failures+1,status=CASE WHEN failures>=2 THEN 'failed' ELSE status END,last_checked=?,next_check=?,lease=NULL,lease_until=NULL WHERE id=? AND lease=? AND status='active'",
        )
        .bind(
          time,
          new Date(at.getTime() + 3600000).toISOString(),
          watch.id,
          lease,
        ),
    ]);
    return { checked: false, unavailable: true };
  }
}
/** Invoked by Cloudflare cron, not a process-local timer. Bounded and leased. */
export async function checkWatches(
  env: Env,
  at = new Date(),
  fetcher: typeof fetch = fetch,
) {
  if (env.WATCHES_ENABLED !== '1') return { checked: 0, disabled: true };
  if (env.MAINTENANCE === '1') return { checked: 0, maintenance: true };
  await env.DB.prepare(
    "UPDATE watches SET status='expired',lease=NULL,lease_until=NULL WHERE status='active' AND expires<=?",
  )
    .bind(at.toISOString())
    .run();
  const due = await env.DB.prepare(
    "SELECT w.* FROM watches w JOIN members m ON m.id=w.member_id WHERE w.status='active' AND w.next_check<=? AND m.active=1 ORDER BY w.next_check LIMIT 5",
  )
    .bind(at.toISOString())
    .all<Row>();
  const results = [];
  for (const w of due.results)
    results.push(await checkOne(env, w, at, fetcher));
  return {
    checked: results.filter((r) => r.checked).length,
    changes: results.filter((r) => 'changed' in r && r.changed).length,
  };
}
export async function watchRoutes(
  request: Request,
  env: Env,
  m: Row,
  b: Row = {},
  fetcher: typeof fetch = fetch,
) {
  const path = new URL(request.url).pathname,
    db = env.DB,
    base = '/api/travel/watches';
  if (path === base && request.method === 'GET') {
    const [w, e] = await Promise.all([
      db
        .prepare(
          'SELECT id,url,title,phrase,status,expires,next_check,last_checked,failures FROM watches WHERE member_id=? AND trip_id=? ORDER BY created DESC LIMIT 20',
        )
        .bind(m.id, m.trip_id)
        .all(),
      db
        .prepare(
          'SELECT e.* FROM watch_events e JOIN watches w ON w.id=e.watch_id WHERE e.member_id=? AND w.trip_id=? ORDER BY e.created DESC LIMIT 20',
        )
        .bind(m.id, m.trip_id)
        .all(),
    ]);
    return json({ watches: w.results, events: e.results });
  }
  if (path === base && request.method === 'POST') {
    if (env.WATCHES_ENABLED !== '1')
      throw new AskError(
        503,
        'Scheduled watches are disabled in this environment.',
      );
    const url = publicURL(text(b.url, 2000)).href,
      title = text(b.title, 120),
      phrase = text(b.phrase ?? '', 120, false),
      hours = Number(b.hours || 24);
    if (
      !title ||
      !Number.isInteger(hours) ||
      hours < 1 ||
      hours > 336 ||
      b.confirm !== true
    )
      throw new AskError(
        422,
        'Confirm a named website watch lasting between one hour and fourteen days.',
      );
    const active = await db
      .prepare(
        "SELECT count(*) n FROM watches WHERE member_id=? AND status='active'",
      )
      .bind(m.id)
      .first<Row>();
    if (active!.n >= 3)
      throw new AskError(429, 'Keep up to three active watches at a time.');
    const time = stamp(),
      id = crypto.randomUUID();
    const changed = await db
      .prepare(
        "INSERT INTO watches(id,member_id,trip_id,url,title,phrase,status,expires,next_check,created) SELECT ?,?,?,?,?,?,'active',?,?,? WHERE (SELECT count(*) FROM watches WHERE member_id=? AND status='active')<3 ON CONFLICT(member_id,url,phrase) DO UPDATE SET title=excluded.title,status='active',expires=excluded.expires,next_check=excluded.next_check,failures=0 RETURNING id",
      )
      .bind(
        id,
        m.id,
        m.trip_id,
        url,
        title,
        phrase,
        new Date(Date.now() + hours * 3600000).toISOString(),
        time,
        time,
        m.id,
      )
      .first<Row>();
    if (!changed)
      throw new AskError(429, 'The active watch limit was reached.');
    const watch = await db
      .prepare('SELECT * FROM watches WHERE id=?')
      .bind(changed.id)
      .first<Row>();
    const initial = await checkOne(env, watch!, new Date(), fetcher);
    return json(
      {
        id: changed.id,
        ...initial,
        notice:
          'Watch saved. Checks run approximately hourly through Cloudflare, with in-app updates only on a page change or repeated failure. This cannot verify ticket availability.',
      },
      201,
    );
  }
  const match = path.match(
    /^\/api\/travel\/watches\/([\w-]+)\/(cancel|check|seen)$/,
  );
  if (!match || request.method !== 'POST')
    throw new AskError(404, 'That watch action is not available.');
  const watch = await db
    .prepare('SELECT * FROM watches WHERE id=? AND member_id=? AND trip_id=?')
    .bind(match[1], m.id, m.trip_id)
    .first<Row>();
  if (!watch) throw new AskError(404, 'That watch is not yours.');
  if (match[2] === 'seen')
    await db
      .prepare(
        'UPDATE watch_events SET seen=1 WHERE watch_id=? AND member_id=?',
      )
      .bind(watch.id, m.id)
      .run();
  else if (match[2] === 'cancel')
    await db
      .prepare(
        "UPDATE watches SET status='cancelled',lease=NULL,lease_until=NULL WHERE id=? AND member_id=?",
      )
      .bind(watch.id, m.id)
      .run();
  else {
    if (watch.status !== 'active' || Date.parse(watch.expires) <= Date.now())
      throw new AskError(409, 'Restart an active watch before checking it.');
    if (
      watch.last_checked &&
      Date.now() - Date.parse(watch.last_checked) < 60000
    )
      throw new AskError(429, 'Wait one minute before another manual check.');
    return json(await checkOne(env, watch, new Date(), fetcher));
  }
  return json({ ok: true });
}
