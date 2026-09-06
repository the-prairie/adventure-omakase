import {
  AskError,
  parseAsk,
  record,
  text,
  type AskInput,
  type AskResult,
  type MemberContext,
  type Place,
  type Source,
  type Usage,
} from './ask-contract.js';
import { runAsk, type Model } from './ask-engine.js';
import { readPage, searchPlaces, publicURL, hashText } from './ask-research.js';
import { geminiModel, modelName } from './companion-provider.js';
import type { Env, Row } from './platform.js';
import { findPlaces } from './travel-tools.js';
export interface AskActions {
  snapshot(): Promise<Row>;
  createPlan(input: Row, expectedSeq?: number): Promise<Row>;
  updatePlan(id: string, input: Row, expectedSeq?: number): Promise<Row>;
  createDiscovery(input: Row): Promise<Row>;
  catalogue(): Promise<Place[]>;
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
const TASK_NEURONS = 3000,
  DAILY_NEURONS = 8000,
  TIMEOUT_MS = 75000;
const now = () => new Date().toISOString();
const parse = (s: unknown) => JSON.parse(typeof s === 'string' ? s : '{}');
export function memberContext(state: Row, excludedPlanId = ''): MemberContext {
  const id = state.me.id;
  const reference = state.plans.find((p: Row) => p.id === excludedPlanId);
  return {
    ...(reference
      ? {
          referencePlan: {
            title: reference.title,
            description: reference.description,
            date: reference.date,
            segments: reference.segments,
          },
        }
      : {}),
    preferences: state.me.profile.interests || '',
    travelWindows: state.me.profile.windows || [],
    commitments: state.plans
      .filter((p: Row) => p.status === 'open' && p.id !== excludedPlanId)
      .flatMap((p: Row) => {
        const r = p.rsvps.find(
          (r: Row) => r.memberId === id && r.status === 'joined',
        );
        if (p.hostId !== id && !r) return [];
        const part =
          r && r.choice !== 'all'
            ? p.segments.find((s: Row) => s.id === r.choice)
            : p;
        if (!part) return [];
        return [
          {
            title: part.label || p.title,
            date: p.date,
            start: part.start,
            end: part.end,
            meeting: part.meeting,
            reconfirm: !!r && r.acceptedRevision !== p.revision,
          },
        ];
      }),
  };
}
const taskView = (t: Row) => ({
  id: t.id,
  status: t.status,
  stage: t.stage,
  input: parse(t.input),
  result: parse(t.result),
  usage: parse(t.usage),
  planId: t.plan_id,
  created: t.created,
  updated: t.updated,
});
export async function askRoutes(
  request: Request,
  env: Env,
  member: Row,
  actions: AskActions,
  providedBody?: Row,
): Promise<Response> {
  const external = !!env.GEMINI_API_KEY;
  const taskBudget = external ? 200000 : TASK_NEURONS;
  const dailyBudget = external ? 1000000 : DAILY_NEURONS;
  const db = env.DB,
    base = '/api/ask/tasks',
    path = new URL(request.url).pathname;
  const first = (sql: string, ...v: unknown[]) =>
    db
      .prepare(sql)
      .bind(...v)
      .first<Row>();
  const run = (sql: string, ...v: unknown[]) =>
    db
      .prepare(sql)
      .bind(...v)
      .run();
  const get = (id: string) =>
    first(
      'SELECT * FROM ask_tasks WHERE id=? AND member_id=? AND trip_id=?',
      id,
      member.id,
      member.trip_id,
    );
  try {
    if (path === '/api/ask/status' && request.method === 'GET')
      return json({
        available: !!env.AI || external,
        model: modelName(env),
        taskTimeoutSeconds: 75,
        dailyNeuronLimit: external ? undefined : DAILY_NEURONS,
        dailyUSDEstimateLimit: external ? dailyBudget / 1e6 : undefined,
        search: external
          ? 'Existing discoveries, Google Places leads and public venue pages. No availability or booking service.'
          : 'Existing discoveries, Wikipedia discovery search and public source pages. No availability or booking service.',
      });
    const research = path.match(/^\/api\/research\/([-\w]+)$/);
    if (research && request.method === 'GET') {
      const values = await db
        .prepare(
          'SELECT evidence FROM place_research WHERE trip_id=? AND discovery_id=? ORDER BY checked_at DESC',
        )
        .bind(member.trip_id, research[1])
        .all<Row>();
      return json({
        sources: values.results.map((r) => {
          const e = parse(r.evidence);
          delete e.text;
          return e;
        }),
      });
    }
    if (path === base && request.method === 'GET') {
      const tasks = await db
        .prepare(
          'SELECT * FROM ask_tasks WHERE member_id=? AND trip_id=? ORDER BY created DESC LIMIT 8',
        )
        .bind(member.id, member.trip_id)
        .all<Row>();
      return json({ tasks: tasks.results.map(taskView) });
    }
    const match = path.match(
      /^\/api\/ask\/tasks\/([-\w]+)(?:\/(cancel|confirm|save))?$/,
    );
    if (match) {
      let task = await get(match[1]);
      if (!task && match[2] === 'cancel' && request.method === 'POST') {
        if (!/^[a-zA-Z0-9_-]{12,80}$/.test(match[1]))
          throw new AskError(422, 'Invalid request identifier.');
        await run(
          "INSERT INTO ask_tasks(id,member_id,trip_id,status,stage,input,context_seq,budget_day,settled,created,updated) VALUES(?,?,?,'cancelled','Cancelled before starting. Nothing was published.','{}',0,'',1,?,?) ON CONFLICT DO NOTHING",
          match[1],
          member.id,
          member.trip_id,
          now(),
          now(),
        );
        task = await get(match[1]);
      }
      if (!task)
        throw new AskError(
          404,
          'This research belongs to another session or is no longer available.',
        );
      if (!match[2] && request.method === 'GET') {
        if (
          task.status === 'running' &&
          Date.now() - Date.parse(task.created) > TIMEOUT_MS + 10000
        ) {
          await run(
            "UPDATE ask_tasks SET status='failed',stage='Request expired. Start a new task.',updated=? WHERE id=? AND member_id=? AND status='running'",
            now(),
            task.id,
            member.id,
          );
          return json(taskView((await get(task.id))!));
        }
        return json(taskView(task));
      }
      if (match[2] === 'cancel' && request.method === 'POST') {
        await run(
          "UPDATE ask_tasks SET status='cancelled',stage='Cancelled. Nothing was published.',updated=? WHERE id=? AND member_id=? AND status IN ('running','complete')",
          now(),
          task.id,
          member.id,
        );
        return json(taskView((await get(task.id))!));
      }
      if (match[2] === 'confirm' && request.method === 'POST') {
        // Duplicate confirmations return the canonical original result before stale-context checks.
        const existing = await first(
          'SELECT id FROM plans WHERE host_id=? AND (request_id=? OR last_edit_request=?)',
          member.id,
          'ask-' + task.id,
          'ask-edit-' + task.id,
        );
        if (existing)
          return json({
            plan: await actions
              .snapshot()
              .then((s) => s.plans.find((p: Row) => p.id === existing.id)),
            duplicate: true,
          });
        if (task.status !== 'complete')
          throw new AskError(
            409,
            'Only a completed, uncancelled preview can be published.',
          );
        const state = await actions.snapshot();
        if (state.seq !== task.context_seq)
          throw new AskError(
            409,
            'The trip changed while you were drafting. Refresh the research and review a new confirmation; your edits have not been applied.',
          );
        const b = record(providedBody),
          result = parse(task.result) as AskResult,
          index = Number(b.option);
        if (!Number.isInteger(index) || !result.options[index])
          throw new AskError(422, 'Choose one of this task’s options.');
        const draft = record(b.draft),
          input = parse(task.input) as AskInput;
        if (draft.date !== input.date || draft.region !== input.region)
          throw new AskError(
            409,
            'Changing date or region needs a fresh check.',
          );
        const draftStart = text(draft.start, 5),
          draftEnd = text(draft.end, 5);
        const draftSegments = Array.isArray(draft.segments)
          ? draft.segments.map(record)
          : [];
        const finalCommitments = memberContext(
          state,
          input.reviseExisting ? input.referencePlanId : undefined,
        ).commitments;
        if (
          finalCommitments.some(
            (c) =>
              c.date === draft.date && c.start < draftEnd && c.end > draftStart,
          )
        )
          throw new AskError(
            422,
            'These edited times overlap your commitment. Choose another time; nothing was published.',
          );
        let saved: Row;
        if (input.reviseExisting) {
          const original = state.plans.find(
            (p: Row) => p.id === input.referencePlanId,
          );
          if (!original || original.hostId !== member.id)
            throw new AskError(
              403,
              'Only the host can confirm changes to this invitation.',
            );
          if (
            draftSegments.length !== original.segments.length ||
            original.segments.some(
              (part: Row) =>
                !draftSegments.some(
                  (next: Row) =>
                    next.id === part.id && next.label === part.label,
                ),
            )
          )
            throw new AskError(
              422,
              'Keep the same invitation parts when confirming a rework. Use the ordinary edit form to change parts.',
            );
          saved = await actions.updatePlan(
            original.id,
            {
              ...draft,
              revision: original.revision,
              booking: 'check',
              editRequestId: 'ask-edit-' + task.id,
            },
            task.context_seq,
          );
        } else
          saved = await actions.createPlan(
            { ...draft, booking: 'check', requestId: 'ask-' + task.id },
            task.context_seq,
          );
        await run(
          "UPDATE ask_tasks SET status='published',stage='Invitation published in the trip.',plan_id=?,updated=? WHERE id=? AND member_id=?",
          saved.id,
          now(),
          task.id,
          member.id,
        );
        return json({ plan: saved }, 201);
      }
      if (match[2] === 'save' && request.method === 'POST') {
        if (!['complete', 'published'].includes(task.status))
          throw new AskError(
            409,
            'Complete the research before saving a find.',
          );
        const result = parse(task.result) as AskResult,
          b = record(providedBody),
          id = text(b.discoveryId, 80),
          place = result.places.find((p) => p.id === id);
        if (!place)
          throw new AskError(422, 'Choose a place from this research.');
        if (!place.external) return json({ id: place.id });
        const saved = await actions.createDiscovery({
          title: place.title,
          region: place.region,
          area: place.area,
          why: 'Research lead. Check the attached dated source before going.',
          source: place.source,
          minutes: place.minutes,
          category: place.category || 'culture',
          requestId: 'ask-place-' + task.id + '-' + id,
        });
        for (const source of result.sources.filter((s) => s.discoveryId === id))
          await run(
            'INSERT INTO place_research VALUES(?,?,?,?,?) ON CONFLICT(trip_id,discovery_id,source_url) DO UPDATE SET evidence=excluded.evidence,checked_at=excluded.checked_at',
            member.trip_id,
            saved.id,
            source.url,
            JSON.stringify({ ...source, discoveryId: saved.id }),
            source.checkedAt,
          );
        return json(saved, 201);
      }
      throw new AskError(404, 'That companion action is not available.');
    }
    if (path !== base || request.method !== 'POST')
      throw new AskError(404, 'That companion action is not available.');
    if (!env.AI && !external)
      throw new AskError(
        503,
        'Ask Omakase is unavailable. The fieldbook and ordinary invitations still work.',
      );
    const state = await actions.snapshot(),
      input = parseAsk(providedBody, state.trip);
    if (
      input.reviseExisting &&
      !state.plans.some(
        (p: Row) =>
          p.id === input.referencePlanId &&
          p.hostId === member.id &&
          p.status === 'open',
      )
    )
      throw new AskError(403, 'Choose your own open invitation to revise.');
    if (input.reviseExisting) {
      const reference = state.plans.find(
        (p: Row) => p.id === input.referencePlanId,
      );
      if (
        !reference.segments.length ||
        new Set(reference.segments.map((s: Row) => s.label)).size !==
          reference.segments.length
      )
        throw new AskError(
          422,
          'Use Edit invitation for a plan without separately named parts. No model request was made.',
        );
    }
    const existing = await get(input.requestId);
    if (existing)
      return json(
        taskView(existing),
        existing.status === 'running' ? 202 : 200,
      );
    if (
      input.referencePlanId &&
      !state.plans.some((p: Row) => p.id === input.referencePlanId)
    )
      throw new AskError(
        404,
        'That referenced invitation is no longer in this trip.',
      );
    if (
      (await first(
        'SELECT count(*) AS n FROM ask_tasks WHERE member_id=? AND created>?',
        member.id,
        new Date(Date.now() - 3600000).toISOString(),
      ))!.n >= 4
    )
      throw new AskError(
        429,
        'You have reached four research tasks this hour. The ordinary app is still available.',
      );
    const calendarDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const day = external ? 'gemini:' + calendarDay : calendarDay;
    const made = await run(
      "INSERT INTO ask_tasks(id,member_id,trip_id,status,stage,input,context_seq,budget_day,created,updated) VALUES(?,?,?,'running','Starting your research',?,?,?,?,?) ON CONFLICT(member_id,id) DO NOTHING",
      input.requestId,
      member.id,
      member.trip_id,
      JSON.stringify(input),
      state.seq,
      day,
      now(),
      now(),
    );
    if (!made.meta.changes)
      return json(taskView((await get(input.requestId))!), 202);
    const budget = await db.batch([
      db
        .prepare(
          'INSERT INTO ask_budget(trip_id,day) VALUES(?,?) ON CONFLICT DO NOTHING',
        )
        .bind(member.trip_id, day),
      db
        .prepare(
          'UPDATE ask_budget SET reserved=reserved+? WHERE trip_id=? AND day=? AND used+reserved+?<=? RETURNING day',
        )
        .bind(taskBudget, member.trip_id, day, taskBudget, dailyBudget),
    ]);
    if (!budget[1].results.length) {
      await run(
        "UPDATE ask_tasks SET status='failed',stage='The trip’s daily AI budget is reserved or used. Try later.',settled=1 WHERE id=? AND member_id=?",
        input.requestId,
        member.id,
      );
      throw new AskError(
        429,
        'The trip’s daily AI budget is reserved or used. The fieldbook still works.',
      );
    }
    let usage: Usage | undefined;
    let providerPending = false;
    const controller = new AbortController(),
      timer = setTimeout(
        () => controller.abort(new Error('Task timed out')),
        TIMEOUT_MS,
      );
    const signal = controller.signal;
    const checkpoint = async () => {
      signal.throwIfAborted();
      const task = await get(input.requestId);
      if (task?.status !== 'running')
        throw new AskError(409, 'Research cancelled. Nothing was published.');
    };
    try {
      const places = (await actions.catalogue()).filter(
        (p) => p.region === input.region,
      );
      places.push(
        ...state.discoveries
          .filter((p: Row) => p.region === input.region)
          .map((p: Row) => ({
            id: p.id,
            title: p.title,
            region: p.region,
            area: p.area,
            source: p.source,
            why: p.why,
            minutes: p.minutes,
            category: p.category,
          })),
      );
      if (input.url) {
        const url = publicURL(input.url).href,
          id = 'web-' + (await hashText(url)).slice(0, 24);
        places.push({
          id,
          title: 'Your linked idea',
          region: input.region,
          area: input.area,
          source: url,
          why: 'A page supplied for checking; its content is untrusted evidence.',
          minutes: 120,
          external: true,
        });
        input.discoveryId = id;
      }
      if (input.discoveryId && !places.some((p) => p.id === input.discoveryId))
        throw new AskError(422, 'Choose a discovery in the selected region.');
      // Inference has no authority and no background job is promised. A timeout ends this request.
      const nativeModel = external ? geminiModel(env, signal) : env.AI!;
      const model: Model = {
        run: async (model, input) => {
          providerPending = true;
          const result = await Promise.race([
            nativeModel.run(model, input),
            new Promise<never>((_resolve, reject) =>
              signal.addEventListener(
                'abort',
                () => reject(new Error('Task timed out')),
                { once: true },
              ),
            ),
          ]);
          providerPending = false;
          return result;
        },
      };
      const result = await runAsk(
        input,
        memberContext(
          state,
          input.reviseExisting ? input.referencePlanId : undefined,
        ),
        places,
        model,
        {
          checkpoint,
          progress: async (stage, u) => {
            usage = { ...u };
            signal.throwIfAborted();
            const updated = await first(
              "UPDATE ask_tasks SET stage=?,usage=?,updated=? WHERE id=? AND member_id=? AND status='running' RETURNING id",
              stage,
              JSON.stringify(u),
              now(),
              input.requestId,
              member.id,
            );
            if (!updated)
              throw new AskError(
                409,
                'Research cancelled. Nothing was published.',
              );
          },
          searchPlaces: async (query) => {
            const timeout = AbortSignal.any([
              signal,
              AbortSignal.timeout(7000),
            ]);
            try {
              if (external) {
                const found = await findPlaces(
                  env,
                  query + ' ' + input.region + ' Japan',
                  timeout,
                );
                return found.places
                  .filter((p: Row) => p.website)
                  .slice(0, 3)
                  .map((p: Row) => ({
                    id: 'external-' + crypto.randomUUID().slice(0, 8),
                    title: 'New public venue page',
                    region: input.region,
                    area: input.area,
                    source: p.website,
                    minutes: 90,
                    why: 'Read the public website before assessing suitability.',
                    external: true,
                  }));
              }
              return await searchPlaces(query, input.region, timeout);
            } catch {
              signal.throwIfAborted();
              return [];
            }
          },
          checkSource: async (place) => {
            const cached = await first(
              'SELECT evidence,checked_at FROM place_research WHERE trip_id=? AND discovery_id=? AND source_url=?',
              member.trip_id,
              place.id,
              place.source,
            );
            if (
              cached &&
              Date.now() - Date.parse(cached.checked_at) < 86400000
            ) {
              const source = parse(cached.evidence) as Source;
              if (source.status === 'read') return { ...source, cached: true };
            }
            const source = await readPage(
              place,
              AbortSignal.any([signal, AbortSignal.timeout(8000)]),
            ).catch(() => ({
              id: 'src-' + place.id,
              discoveryId: place.id,
              url: place.source,
              title: place.title,
              checkedAt: now(),
              status: 'unavailable' as const,
              text: '',
              digest: '',
              cached: false,
            }));
            await checkpoint();
            await run(
              'INSERT INTO place_research VALUES(?,?,?,?,?) ON CONFLICT(trip_id,discovery_id,source_url) DO UPDATE SET evidence=excluded.evidence,checked_at=excluded.checked_at',
              member.trip_id,
              place.id,
              place.source,
              JSON.stringify(source),
              source.checkedAt,
            );
            if (place.external && source.status === 'read')
              place.title = source.title;
            return source;
          },
        },
        signal,
        modelName(env),
      );
      await checkpoint();
      usage = result.usage;
      if (input.reviseExisting) {
        const original = state.plans.find(
          (p: Row) => p.id === input.referencePlanId,
        );
        for (const option of result.options) {
          const labels = option.draft.segments.map((part) => part.label);
          if (
            labels.length !== original.segments.length ||
            new Set(labels).size !== labels.length ||
            original.segments.some((part: Row) => !labels.includes(part.label))
          )
            throw new AskError(
              422,
              'The rework changed the invitation parts. Retry keeping the same part labels, or edit the invitation manually. Nothing was changed.',
            );
          option.draft.segments = option.draft.segments.map((part) => ({
            ...part,
            id: original.segments.find((old: Row) => old.label === part.label)
              .id,
          }));
        }
      }
      const commitments = memberContext(
        state,
        input.reviseExisting ? input.referencePlanId : undefined,
      ).commitments;
      if (
        result.options.some((o) =>
          commitments.some(
            (c) =>
              c.date === o.draft.date &&
              c.start < o.draft.end &&
              c.end > o.draft.start,
          ),
        )
      )
        throw new AskError(
          422,
          'The proposed times overlap a commitment. Choose another time window; nothing was published.',
        );
      // Only source-backed quotations are shared at place level. Personal reasons stay in this member's task.
      for (const source of result.sources) {
        const quotes = result.options.flatMap((o) =>
          o.citations
            .filter((c) => c.sourceId === source.id)
            .map((c) => c.quote),
        );
        await run(
          'UPDATE place_research SET evidence=? WHERE trip_id=? AND discovery_id=? AND source_url=?',
          JSON.stringify({ ...source, quotes }),
          member.trip_id,
          source.discoveryId,
          places.find((p) => p.id === source.discoveryId)?.source || source.url,
        );
      }
      await run(
        "UPDATE ask_tasks SET status='complete',stage='Options ready to review. Nothing published.',result=?,usage=?,updated=? WHERE id=? AND member_id=? AND status='running'",
        JSON.stringify(result),
        JSON.stringify(usage),
        now(),
        input.requestId,
        member.id,
      );
      return json(taskView((await get(input.requestId))!));
    } catch (e) {
      const message =
        e instanceof AskError
          ? e.message
          : signal.aborted
            ? 'The research timed out. Nothing was published.'
            : 'The model or source service failed. Nothing was published; retry when ready.';
      await run(
        "UPDATE ask_tasks SET status='failed',stage=?,updated=? WHERE id=? AND member_id=? AND status='running'",
        message,
        now(),
        input.requestId,
        member.id,
      );
      const task = (await get(input.requestId))!;
      return json(
        taskView(task),
        task.status === 'cancelled'
          ? 200
          : e instanceof AskError
            ? e.status
            : 502,
      );
    } finally {
      clearTimeout(timer);
      // Unknown/aborted provider usage retains its full reservation as conservative consumed budget.
      const cost =
        providerPending || usage?.measured === false
          ? taskBudget
          : external
            ? Math.ceil((usage?.estimatedUSD || 0) * 1e6)
            : usage?.neurons || 0;
      await db.batch([
        db
          .prepare(
            'UPDATE ask_budget SET reserved=max(0,reserved-?),used=used+? WHERE trip_id=? AND day=? AND EXISTS(SELECT 1 FROM ask_tasks WHERE id=? AND member_id=? AND settled=0)',
          )
          .bind(
            taskBudget,
            cost,
            member.trip_id,
            day,
            input.requestId,
            member.id,
          ),
        db
          .prepare('UPDATE ask_tasks SET settled=1 WHERE id=? AND member_id=?')
          .bind(input.requestId, member.id),
      ]);
    }
  } catch (e) {
    if (e instanceof AskError) return json({ detail: e.message }, e.status);
    throw e;
  }
}
