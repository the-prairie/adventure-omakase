/** Framework-neutral companion contracts. None of these values grant authority. */
export type AskMode = 'find' | 'check';
export interface AskInput {
  requestId: string;
  mode: AskMode;
  prompt: string;
  date: string;
  region: string;
  area: string;
  start: string;
  end: string;
  discoveryId?: string;
  url?: string;
  referencePlanId?: string;
}
export interface Place {
  id: string;
  title: string;
  region: string;
  area: string;
  source: string;
  minutes: number;
  why: string;
  category?: string;
  mood?: string;
  external?: boolean;
}
export interface Source {
  id: string;
  discoveryId: string;
  url: string;
  title: string;
  checkedAt: string;
  status: 'read' | 'unavailable';
  text: string;
  digest: string;
  cached: boolean;
}
export interface Citation {
  sourceId: string;
  quote: string;
}
export interface InvitationDraft {
  title: string;
  date: string;
  region: string;
  area: string;
  start: string;
  end: string;
  meeting: string;
  description: string;
  cost: string;
  booking: 'check';
  kind: 'going' | 'idea';
  effort: 'easy' | 'active' | 'demanding';
  catalogueId: string;
  joinStyle: 'open';
  capacity: null;
  segments: {
    id: string;
    label: string;
    start: string;
    end: string;
    meeting: string;
    discoveryId?: string;
  }[];
}
export interface Option {
  discoveryId: string;
  title: string;
  reason: string;
  effort: string;
  uncertainty: string;
  citations: Citation[];
  draft: InvitationDraft;
}
export interface AskResult {
  question: string;
  options: Option[];
  sources: Source[];
  places: Place[];
  date: string;
  contextNotice: string;
  usage: Usage;
}
export interface Usage {
  model: string;
  providerCalls: number;
  sourceCalls: number;
  cacheHits: number;
  inputTokens: number;
  outputTokens: number;
  neurons: number;
  measured: boolean;
  estimatedUSD: number;
  elapsedMs: number;
}
export interface MemberContext {
  preferences: string;
  travelWindows: {
    region: string;
    area: string;
    from: string;
    to: string;
  }[];
  commitments: {
    title: string;
    date: string;
    start: string;
    end: string;
    meeting: string;
    reconfirm: boolean;
  }[];
}
export class AskError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new AskError(422, 'Use a structured request.');
  return v as Record<string, unknown>;
};
export function text(v: unknown, max: number, required = true): string {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
    throw new AskError(422, `Use text up to ${max} characters.`);
  return v.trim();
}
export function calendarDate(v: unknown): string {
  const s = text(v, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new AskError(422, 'Choose an actual calendar date.');
  return s;
}
export function time(v: unknown): string {
  const s = text(v, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))
    throw new AskError(422, 'Choose a Japan-local time.');
  return s;
}
export function parseAsk(
  v: unknown,
  trip: { start: string; end: string },
): AskInput {
  const d = record(v),
    date = calendarDate(d.date),
    start = time(d.start),
    end = time(d.end);
  if (date < trip.start || date > trip.end || start >= end)
    throw new AskError(422, 'Choose a time within the trip window.');
  const region = text(d.region, 30),
    mode = text(d.mode, 10);
  if (
    !['tokyo', 'osaka', 'okinawa', 'elsewhere'].includes(region) ||
    !['find', 'check'].includes(mode)
  )
    throw new AskError(422, 'Choose a region and a task.');
  const requestId = text(d.requestId, 80);
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId))
    throw new AskError(422, 'Start a fresh request.');
  return {
    requestId,
    mode: mode as AskMode,
    prompt: text(d.prompt, 1200),
    date,
    region,
    area: text(d.area, 100),
    start,
    end,
    discoveryId: d.discoveryId ? text(d.discoveryId, 80) : undefined,
    url: d.url ? text(d.url, 2000) : undefined,
    referencePlanId: d.referencePlanId
      ? text(d.referencePlanId, 80)
      : undefined,
  };
}
const optional = (v: unknown, max: number) =>
  v === undefined ? '' : text(v, max, false);
export function validateResult(
  raw: unknown,
  input: AskInput,
  places: Place[],
  sources: Source[],
): Pick<AskResult, 'question' | 'options'> {
  const d = record(raw),
    question = optional(d.question, 240);
  if (
    !Array.isArray(d.options) ||
    d.options.length > 3 ||
    (!question && !d.options.length)
  )
    throw new AskError(
      502,
      'The companion did not return usable cards. Retry this task.',
    );
  const options = d.options.map((value) => {
    const o = record(value),
      id = text(o.discoveryId, 80),
      place = places.find((p) => p.id === id);
    if (!place || place.region !== input.region)
      throw new AskError(
        502,
        'An option did not match your selected region. Nothing was published.',
      );
    if (!sources.some((s) => s.discoveryId === id))
      throw new AskError(
        502,
        'An option was not checked against a source. Retry this task.',
      );
    if (!Array.isArray(o.citations) || o.citations.length > 3)
      throw new AskError(502, 'Source references were incomplete.');
    const rawDraft = record(o.draft);
    const linkedIds = new Set([
      id,
      ...(Array.isArray(rawDraft.segments)
        ? rawDraft.segments.map((s) => record(s).discoveryId)
        : []),
    ]);
    const citations = o.citations.map((value) => {
      const c = record(value),
        sourceId = text(c.sourceId, 100),
        quote = text(c.quote, 400),
        s = sources.find((s) => s.id === sourceId);
      if (
        !s ||
        s.status !== 'read' ||
        !linkedIds.has(s.discoveryId) ||
        quote.length < 20 ||
        !s.text.includes(quote)
      )
        throw new AskError(
          502,
          'A citation did not match the checked page. Nothing was published.',
        );
      return { sourceId, quote };
    });
    const p = record(o.draft);
    if (
      !Array.isArray(p.segments) ||
      !p.segments.length ||
      p.segments.length > 5
    )
      throw new AskError(
        502,
        'The draft needs separately timed meeting parts.',
      );
    // The invitation span is derived from its parts, so model summaries cannot disagree.
    const start = p.segments.map((s) => time(record(s).start)).sort()[0];
    const end = p.segments
      .map((s) => time(record(s).end))
      .sort()
      .at(-1)!;
    if (start < input.start || end > input.end || end <= start)
      throw new AskError(502, 'The draft did not fit the time you chose.');
    const ids = new Set<string>();
    const segments = p.segments.map((value, index) => {
      const s = record(value),
        begin = time(s.start),
        finish = time(s.end),
        id = `part-${index + 1}`;
      if (begin < start || finish > end || finish <= begin || ids.has(id))
        throw new AskError(502, 'A draft part has invalid times.');
      const placeId = text(s.discoveryId, 80);
      if (
        !places.some((p) => p.id === placeId && p.region === input.region) ||
        !sources.some((s) => s.discoveryId === placeId)
      )
        throw new AskError(
          502,
          'Every named part needs its own checked place source.',
        );
      const source = sources.find((s) => s.discoveryId === placeId)!;
      if (
        source.status === 'read' &&
        !citations.some((c) => c.sourceId === source.id)
      )
        throw new AskError(
          502,
          'Each checked activity and lunch needs an exact source quotation.',
        );
      ids.add(id);
      return {
        id,
        label: text(s.label, 100),
        start: begin,
        end: finish,
        meeting: text(s.meeting, 500),
        discoveryId: placeId,
      };
    });
    const draft: InvitationDraft = {
      title: text(p.title, 150),
      date: input.date,
      region: input.region,
      area: input.area,
      start,
      end,
      meeting: segments[0].meeting,
      description: optional(p.description, 2200),
      cost: optional(p.cost, 160),
      booking: 'check',
      kind: /going either way|going anyway|i.m going|either way/i.test(
        input.prompt,
      )
        ? 'going'
        : 'idea',
      effort: ['easy', 'active', 'demanding'].includes(String(p.effort))
        ? (p.effort as InvitationDraft['effort'])
        : 'easy',
      catalogueId: place.external ? '' : id,
      joinStyle: 'open',
      capacity: null,
      segments,
    };
    return {
      discoveryId: id,
      title: place.title,
      reason: text(o.reason, 500),
      effort: text(o.effort, 200),
      uncertainty: text(o.uncertainty, 600),
      citations,
      draft,
    };
  });
  if (input.mode === 'find' && !question && options.length < 2)
    throw new AskError(
      502,
      'The companion needs to return two or three options. Please retry.',
    );
  return { question: options.length ? '' : question, options };
}
