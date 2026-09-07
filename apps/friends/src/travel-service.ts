import { AskError, record, text } from './ask-contract.js';
import type { Env, Row } from './platform.js';
import { importBookings } from './profile-import.js';
import { findPlaces, getRoute, interpret, webSearch } from './travel-tools.js';
import { watchRoutes } from './watch-service.js';
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
export async function travelRoutes(
  request: Request,
  env: Env,
  member: Row,
  body?: Row,
) {
  const path = new URL(request.url).pathname,
    db = env.DB;
  try {
    if (path.startsWith('/api/travel/watches'))
      return await watchRoutes(request, env, member, body);
    if (path === '/api/travel/status')
      return json({
        model: !!env.GEMINI_API_KEY,
        maps: !!env.GOOGLE_MAPS_API_KEY,
      });
    const idMatch = path.match(
      /^\/api\/travel\/tasks\/([\w-]{12,80})(?:\/(cancel))?$/,
    );
    if (idMatch) {
      const id = idMatch[1];
      if (idMatch[2] === 'cancel' && request.method === 'POST') {
        const stamp = new Date().toISOString();
        await db
          .prepare(
            "INSERT INTO travel_tasks(id,member_id,trip_id,kind,status,created,updated) VALUES(?,?,?,'translate','cancelled',?,?) ON CONFLICT(member_id,id) DO UPDATE SET status=CASE WHEN travel_tasks.status='running' THEN 'cancelled' ELSE travel_tasks.status END,updated=excluded.updated",
          )
          .bind(id, member.id, member.trip_id, stamp, stamp)
          .run();
        return json({
          cancelled: true,
          notice:
            'Cancellation recorded. In-flight provider usage may still be billed; nothing can publish automatically.',
        });
      }
      const task = await db
        .prepare(
          'SELECT id,kind,status,result,created FROM travel_tasks WHERE id=? AND member_id=? AND trip_id=?',
        )
        .bind(id, member.id, member.trip_id)
        .first<Row>();
      if (!task)
        throw new AskError(404, 'That helper request is not available.');
      return json({ ...task, result: JSON.parse(task.result) });
    }
    if (path === '/api/travel/tasks' && request.method === 'GET') {
      const rows = await db
        .prepare(
          'SELECT id,kind,status,result,created FROM travel_tasks WHERE member_id=? AND trip_id=? ORDER BY created DESC LIMIT 8',
        )
        .bind(member.id, member.trip_id)
        .all<Row>();
      return json({
        tasks: rows.results.map((r) => ({
          ...r,
          result: JSON.parse(r.result),
        })),
      });
    }
    if (path !== '/api/travel/tasks' || request.method !== 'POST')
      throw new AskError(404, 'That travel tool does not exist.');
    const b = record(body),
      id = text(b.requestId, 80),
      kind = text(b.kind, 20);
    if (
      !/^[\w-]{12,80}$/.test(id) ||
      ![
        'translate',
        'memory',
        'places',
        'route',
        'search',
        'profile-import',
      ].includes(kind)
    )
      throw new AskError(422, 'Choose a travel tool and a valid request.');
    const old = await db
      .prepare(
        'SELECT status,result FROM travel_tasks WHERE member_id=? AND id=?',
      )
      .bind(member.id, id)
      .first<Row>();
    if (old)
      return json(
        { status: old.status, result: JSON.parse(old.result), duplicate: true },
        old.status === 'running' ? 202 : 200,
      );
    const stamp = new Date().toISOString();
    // A single INSERT bounds concurrent requests, including separate tabs.
    const made = await db
      .prepare(
        "INSERT INTO travel_tasks(id,member_id,trip_id,kind,status,created,updated) SELECT ?,?,?,?,'running',?,? WHERE (SELECT count(*) FROM travel_tasks WHERE member_id=? AND created>?)<12 ON CONFLICT DO NOTHING RETURNING id",
      )
      .bind(
        id,
        member.id,
        member.trip_id,
        kind,
        stamp,
        stamp,
        member.id,
        new Date(Date.now() - 3600000).toISOString(),
      )
      .first();
    if (!made)
      throw new AskError(
        429,
        'You have reached twelve helper requests this hour.',
      );
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 60000);
    try {
      const query = text(b.query ?? '', 500, false);
      if (['places', 'search'].includes(kind) && query.length < 3)
        throw new AskError(422, 'Enter a place or research question.');
      const origin = text(b.origin ?? '', 300, false),
        destination = text(b.destination ?? '', 300, false);
      if (kind === 'route' && (!origin || !destination))
        throw new AskError(422, 'Enter both ends of the route.');
      const trip =
        kind === 'profile-import'
          ? await db
              .prepare('SELECT start,end FROM trips WHERE id=?')
              .bind(member.trip_id)
              .first<Row>()
          : null;
      const result =
        kind === 'profile-import'
          ? await importBookings(env, b, trip!, controller.signal)
          : kind === 'places'
            ? await findPlaces(env, query, controller.signal)
            : kind === 'route'
              ? await getRoute(
                  env,
                  origin,
                  destination,
                  text(b.mode ?? '', 20, false) || 'WALK',
                  controller.signal,
                )
              : kind === 'search'
                ? await webSearch(env, query, controller.signal)
                : await interpret(env, b, controller.signal);
      const ephemeral = ['places', 'route', 'search'].includes(kind);
      const changed = await db
        .prepare(
          "UPDATE travel_tasks SET status='complete',result=?,updated=? WHERE id=? AND member_id=? AND status='running' RETURNING id",
        )
        .bind(
          JSON.stringify(
            ephemeral
              ? {
                  ephemeral: true,
                  kind,
                  notice:
                    'This live service result is not retained. Run a new check for current information.',
                }
              : result,
          ),
          new Date().toISOString(),
          id,
          member.id,
        )
        .first();
      if (!changed) return json({ status: 'cancelled' });
      return json({ id, status: 'complete', result });
    } catch (e) {
      const message =
        e instanceof AskError
          ? e.message
          : 'The helper could not finish. Nothing was saved or published.';
      await db
        .prepare(
          "UPDATE travel_tasks SET status='failed',result=?,updated=? WHERE id=? AND member_id=? AND status='running'",
        )
        .bind(
          JSON.stringify({ message }),
          new Date().toISOString(),
          id,
          member.id,
        )
        .run();
      return json({ detail: message }, e instanceof AskError ? e.status : 502);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    if (e instanceof AskError) return json({ detail: e.message }, e.status);
    throw e;
  }
}
