/** Stable, reviewed table/column order. Never execute identifier names from a backup. */
export const COLUMNS = {
  trips: [
    'id',
    'singleton',
    'name',
    'start',
    'end',
    'invite_token',
    'invite_version',
    'created',
  ],
  members: [
    'id',
    'trip_id',
    'name',
    'role',
    'recovery_hash',
    'profile',
    'active',
    'read_seq',
    'created',
  ],
  plans: [
    'last_edit_request',
    'id',
    'trip_id',
    'host_id',
    'body',
    'revision',
    'status',
    'request_id',
    'created',
    'updated',
  ],
  rsvps: [
    'plan_id',
    'member_id',
    'choice',
    'status',
    'accepted_revision',
    'acknowledge_conflict',
    'updated',
  ],
  comments: [
    'id',
    'plan_id',
    'member_id',
    'text',
    'request_id',
    'created',
    'deleted',
  ],
  picks: ['member_id', 'catalogue_id', 'shared'],
  discoveries: [
    'id',
    'trip_id',
    'member_id',
    'body',
    'revision',
    'deleted',
    'request_id',
    'created',
    'updated',
  ],
  photos: [
    'id',
    'trip_id',
    'member_id',
    'object_key',
    'bytes',
    'sha256',
    'status',
    'created',
  ],
  moments: [
    'id',
    'trip_id',
    'member_id',
    'body',
    'visibility',
    'revision',
    'deleted',
    'request_id',
    'created',
    'updated',
  ],
  changes: [
    'seq',
    'trip_id',
    'actor',
    'kind',
    'entity',
    'summary',
    'audience',
    'created',
  ],
  imports: ['member_id', 'fingerprint', 'created'],
  ask_tasks: [
    'id',
    'member_id',
    'trip_id',
    'status',
    'stage',
    'input',
    'result',
    'usage',
    'context_seq',
    'plan_id',
    'budget_day',
    'settled',
    'created',
    'updated',
  ],
  ask_budget: ['trip_id', 'day', 'reserved', 'used'],
  place_research: [
    'trip_id',
    'discovery_id',
    'source_url',
    'evidence',
    'checked_at',
  ],
  service_budget: ['id', 'used', 'reserved'],
  travel_tasks: [
    'id',
    'member_id',
    'trip_id',
    'kind',
    'status',
    'result',
    'created',
    'updated',
  ],
  watches: [
    'id',
    'member_id',
    'trip_id',
    'url',
    'title',
    'phrase',
    'status',
    'expires',
    'next_check',
    'last_checked',
    'digest',
    'excerpt',
    'failures',
    'created',
    'lease',
    'lease_until',
  ],
  watch_events: [
    'id',
    'watch_id',
    'member_id',
    'summary',
    'before_text',
    'after_text',
    'created',
    'seen',
  ],
};
export function validateBackup(b) {
  if (
    ![3, 4, 5].includes(b.schemaVersion) ||
    !b.tables ||
    !Array.isArray(b.tables.trips) ||
    b.tables.trips.length !== 1
  )
    throw Error('Use a version 3, 4 or 5 full backup with one trip.');
  if (b.schemaVersion === 3)
    for (const t of ['ask_tasks', 'ask_budget', 'place_research'])
      b.tables[t] ||= [];
  if (b.schemaVersion < 5)
    for (const t of [
      'service_budget',
      'travel_tasks',
      'watches',
      'watch_events',
    ])
      b.tables[t] ||= [];
  for (const [t, cols] of Object.entries(COLUMNS)) {
    const rows = b.tables[t];
    if (!Array.isArray(rows) || rows.length > 100000)
      throw Error('Invalid table ' + t);
    for (const row of rows)
      for (const k of Object.keys(row))
        if (!cols.includes(k)) throw Error('Unexpected column ' + t + '.' + k);
  }
  for (const p of b.tables.photos)
    if (!/^[a-zA-Z0-9_-]+$/.test(p.id) || !/^[a-f0-9]{64}$/.test(p.sha256))
      throw Error('Invalid photograph metadata.');
  return b;
}
export function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') {
    if (v.includes('\u0000'))
      throw Error('NUL characters are not supported by the SQL exporter.');
    return "'" + v.replaceAll("'", "''") + "'";
  }
  throw Error('Unsupported SQL value.');
}
export function restoreSQL(b) {
  validateBackup(b);
  const out = [
    '-- Restore into a FRESH, migrated database under MAINTENANCE=1 only.',
    "INSERT OR REPLACE INTO app_meta VALUES('restoring','1');",
  ];
  for (const [t, cols] of Object.entries(COLUMNS))
    for (const row of b.tables[t])
      out.push(
        `INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map((k) => sqlValue(row[k])).join(',')});`,
      );
  out.push("DELETE FROM app_meta WHERE key='restoring';");
  return out.join('\n') + '\n';
}
export function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical(v[k])]),
    );
  return v;
}
export function comparableTables(tables) {
  return Object.fromEntries(
    Object.keys(COLUMNS).map((t) => [
      t,
      (tables[t] || [])
        .map((row) =>
          canonical(
            Object.fromEntries(COLUMNS[t].map((k) => [k, row[k] ?? null])),
          ),
        )
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ]),
  );
}
