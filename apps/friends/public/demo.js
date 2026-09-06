/* Explicit, isolated example trip. Never used as a fallback for a failed live mutation. */
window.OmakaseDemo = (() => {
  const KEY = 'omakase-friends-example-v3';
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = () => new Date().toISOString();
  const people = [
    {
      id: 'example-you',
      name: 'You',
      role: 'owner',
      active: true,
      profile: {
        bio: 'Fictional profile. Try the app from any example traveler’s perspective.',
        interests: 'Running, strange buildings, spontaneous lunches',
        windows: [
          {
            region: 'tokyo',
            area: 'Tokyo',
            from: '2026-09-26',
            to: '2026-09-30',
          },
          {
            region: 'osaka',
            area: 'Osaka',
            from: '2026-10-01',
            to: '2026-10-08',
          },
          {
            region: 'okinawa',
            area: 'Aka / main island',
            from: '2026-10-09',
            to: '2026-10-14',
          },
        ],
      },
    },
    {
      id: 'example-mina',
      name: 'Mina',
      role: 'member',
      active: true,
      profile: {
        bio: 'Fictional traveler. Slow lanes, very good food, the occasional early start.',
        interests: 'Food, craft, neighborhood walks',
        windows: [
          {
            region: 'osaka',
            area: 'Osaka',
            from: '2026-10-02',
            to: '2026-10-07',
          },
          {
            region: 'okinawa',
            area: 'Aka',
            from: '2026-10-10',
            to: '2026-10-13',
          },
        ],
      },
    },
    {
      id: 'example-theo',
      name: 'Theo',
      role: 'member',
      active: true,
      profile: {
        bio: 'Fictional traveler. Usually taking a longer way back.',
        interests: 'Running, water, design',
        windows: [
          {
            region: 'tokyo',
            area: 'Tokyo',
            from: '2026-09-27',
            to: '2026-09-30',
          },
          {
            region: 'osaka',
            area: 'Osaka',
            from: '2026-10-03',
            to: '2026-10-06',
          },
        ],
      },
    },
    {
      id: 'example-jo',
      name: 'Jo',
      role: 'member',
      active: true,
      profile: {
        bio: 'Fictional traveler. My preferred pace is one excellent thing, then lunch.',
        interests: 'Architecture, pottery, coffee',
        windows: [
          {
            region: 'osaka',
            area: 'Osaka',
            from: '2026-10-04',
            to: '2026-10-08',
          },
          {
            region: 'okinawa',
            area: 'Main island',
            from: '2026-10-09',
            to: '2026-10-14',
          },
        ],
      },
    },
  ];
  const plan = (id, hostId, props) => ({
    id,
    hostId,
    revision: 1,
    status: 'open',
    created: '2026-09-06T01:00:00Z',
    updated: '2026-09-06T01:00:00Z',
    rsvps: [],
    comments: [],
    booking: 'check',
    cost: 'Not checked — agree before spending.',
    capacity: null,
    mapLink: '',
    description: '',
    kind: 'going',
    effort: 'easy',
    joinStyle: 'open',
    segments: [],
    catalogueId: '',
    ...props,
  });
  const initial = () => ({
    trip: {
      id: 'example-trip',
      name: 'Japan, slightly off script',
      start: '2026-09-26',
      end: '2026-10-14',
    },
    active: 'example-you',
    members: structuredClone(people),
    plans: [
      plan('example-lanes', 'example-mina', {
        title: 'Lanes first. Curry afterward.',
        region: 'osaka',
        area: 'Karahori & Tanimachi',
        date: '2026-10-04',
        start: '10:00',
        end: '14:00',
        meeting:
          'EXAMPLE ONLY · Matsuyamachi Station, street level. Exact exit to agree.',
        description:
          'I’m taking the slow route through Karahori. Come for the whole wander, or just meet us for lunch. Restaurant and opening still need checking.',
        catalogueId: 'osaka-013',
        capacity: 5,
        segments: [
          {
            id: 'lunch',
            label: 'Just the curry',
            start: '12:30',
            end: '14:00',
            meeting:
              'EXAMPLE ONLY · Meet back outside Matsuyamachi Station; choose the restaurant together.',
          },
        ],
        rsvps: [
          {
            memberId: 'example-jo',
            choice: 'lunch',
            status: 'joined',
            acceptedRevision: 1,
            updated: now(),
          },
        ],
      }),
      plan('example-run', 'example-theo', {
        title: 'A river run. Then a very slow coffee.',
        region: 'osaka',
        area: 'Nakanoshima & Kitahama',
        date: '2026-10-04',
        start: '07:00',
        end: '10:00',
        meeting: 'EXAMPLE ONLY · Nakanoshima Park. Running route not surveyed.',
        description:
          'Doing the run on my own; company is very welcome afterward. No need to run to earn the coffee.',
        catalogueId: 'osaka-011',
        joinStyle: 'reunion',
        effort: 'active',
        segments: [
          {
            id: 'coffee',
            label: 'Meet afterward for coffee',
            start: '09:00',
            end: '10:00',
            meeting:
              'EXAMPLE ONLY · Near Naniwa Bridge on the park side. Exact café to confirm.',
          },
        ],
      }),
      plan('example-concrete', 'example-jo', {
        title: 'Sayamaike, for the building itself.',
        region: 'osaka',
        area: 'Osakasayama',
        date: '2026-10-05',
        start: '10:00',
        end: '16:00',
        meeting:
          'EXAMPLE ONLY · Namba Station. Train and departure meeting point to confirm.',
        description:
          'Anyone curious about ancient water engineering inside a remarkable building? This is an idea, not a booking. We’ll check hours and transport before deciding.',
        catalogueId: 'osaka-005',
        kind: 'idea',
        capacity: 4,
      }),
      plan('example-evening', 'example-you', {
        title: 'A tiny bar. Absolutely no agenda.',
        region: 'tokyo',
        area: 'Koenji',
        date: '2026-09-28',
        start: '18:30',
        end: '21:00',
        meeting:
          'EXAMPLE ONLY · Koenji Station north exit. Venue not selected.',
        description:
          'A low-key evening, somewhere with room for whoever feels like joining. We’ll choose the venue on the day.',
        catalogueId: 'tokyo-028',
      }),
      plan('example-aka', 'example-mina', {
        title: 'Same islands, different speeds.',
        region: 'okinawa',
        area: 'Aka & Geruma',
        date: '2026-10-11',
        start: '06:30',
        end: '10:30',
        meeting:
          'EXAMPLE ONLY · Outside Aka Port terminal. Confirm route, weather and water first.',
        description:
          'Walk, run independently, or skip straight to breakfast. Routes and the breakfast venue are not verified. Ferry travel is a separate commitment.',
        catalogueId: 'okinawa-061',
        effort: 'active',
        segments: [
          {
            id: 'breakfast',
            label: 'Skip straight to breakfast',
            start: '09:30',
            end: '10:30',
            meeting:
              'EXAMPLE ONLY · Reunite outside Aka Port terminal; breakfast venue to confirm.',
          },
        ],
      }),
      plan('example-snack', 'example-theo', {
        title: 'Bring one unfamiliar snack.',
        region: 'tokyo',
        area: 'Yanaka & Nezu',
        date: '2026-09-29',
        start: '11:00',
        end: '12:30',
        meeting: 'EXAMPLE ONLY · Nippori Station west exit.',
        description:
          'A neighborhood wander and a small tasting experiment. We’ll check ingredients and find an appropriate place to eat.',
        catalogueId: 'tokyo-021',
        kind: 'idea',
      }),
      plan('example-pottery', 'example-jo', {
        title: 'Pottery, coast, nowhere urgent.',
        region: 'okinawa',
        area: 'Yomitan',
        date: '2026-10-12',
        start: '10:00',
        end: '14:00',
        meeting:
          'EXAMPLE ONLY · Yomitan pottery area. Exact shop and transport to confirm.',
        description:
          'One craft stop, then lunch. No workshop is reserved; browsing is enough. Getting here from another island is not part of this plan.',
        catalogueId: 'okinawa-021',
      }),
    ],
    picks: [
      { memberId: 'example-mina', catalogueId: 'osaka-013', shared: 1 },
      { memberId: 'example-jo', catalogueId: 'osaka-005', shared: 1 },
      { memberId: 'example-theo', catalogueId: 'tokyo-075', shared: 1 },
    ],
    moments: [],
    discoveries: [],
    changes: [],
    seq: 1,
    readSeq: 0,
    imports: [],
    photos: {},
  });
  let db;
  function load() {
    try {
      db = JSON.parse(localStorage.getItem(KEY));
      if (!db || db.trip?.id !== 'example-trip') throw Error();
    } catch {
      db = initial();
    }
    return snap();
  }
  function persist() {
    try {
      const data = JSON.stringify(db);
      if (data.length > 4000000) throw Error();
      localStorage.setItem(KEY, data);
      return true;
    } catch {
      return false;
    }
  }
  function event(kind, entity, summary, audience = 'group') {
    db.seq++;
    db.changes.unshift({
      seq: db.seq,
      actor: db.active,
      kind,
      entity,
      summary,
      audience,
      created: now(),
    });
    persist();
  }
  function snap() {
    if (!db) load();
    const s = structuredClone(db);
    s.me = s.members.find((m) => m.id === s.active);
    s.picks = s.picks.filter((p) => p.shared || p.memberId === s.active);
    s.trash = s.moments.filter(
      (m) => m.deleted && (m.visibility === 'group' || m.memberId === s.active),
    );
    s.moments = s.moments.filter(
      (m) =>
        !m.deleted && (m.visibility === 'group' || m.memberId === s.active),
    );
    s.changes = s.changes.filter(
      (x) => x.audience === 'group' || x.audience === s.active,
    );
    s.serverTime = now();
    s.mode = 'demo';
    s.storageOkay = persist();
    delete s.imports;
    return s;
  }
  function fail(message, status = 409) {
    const e = new Error(
      typeof message === 'string' ? message : message.message,
    );
    e.status = status;
    e.detail = message;
    throw e;
  }
  function get(id) {
    const p = db.plans.find((p) => p.id === id);
    if (!p) fail('Plan not found.', 404);
    return p;
  }
  function own(p) {
    if (p.hostId !== db.active)
      fail('Only the host can edit this invitation.', 403);
  }
  function valid(p) {
    if (!p.title?.trim() || !p.area?.trim() || !p.meeting?.trim())
      fail('Add a title, area and meeting point.', 422);
    if (!(p.date >= db.trip.start && p.date <= db.trip.end) || p.start >= p.end)
      fail('Check the date and start/end times.', 422);
    for (const s of p.segments || [])
      if (
        !s.label ||
        !s.meeting ||
        s.start < p.start ||
        s.end > p.end ||
        s.start >= s.end
      )
        fail(
          'Meeting options must have a name, meeting point and valid times within the plan.',
          422,
        );
    if (p.joinStyle === 'reunion' && !p.segments?.length)
      fail('Add a meet-afterward option.', 422);
    const a = window.OMAKASE.catalogue.find((a) => a.id === p.catalogueId);
    if (a?.start && (p.date < a.start || p.date > a.end))
      fail('This date falls outside the discovery’s listed event window.', 422);
  }
  function interval(p, choice) {
    const s = p.segments.find((s) => s.id === choice);
    return [p.date, s?.start || p.start, s?.end || p.end];
  }
  async function call(path, method = 'GET', d = {}) {
    if (!db) load();
    const me = db.members.find((x) => x.id === db.active);
    let match;
    if (path === '/state') return snap();
    if (path === '/discoveries' && method === 'POST') {
      const id = 'find-' + uid();
      db.discoveries ??= [];
      db.discoveries.unshift({ ...d, id, memberId: db.active, custom: true });
      event('discovery', id, 'added a find: ' + d.title);
      return { id };
    }
    if ((match = path.match(/^\/moments\/([^/]+)\/restore$/))) {
      const m = db.moments.find((m) => m.id === match[1]);
      if (!m || m.memberId !== db.active) fail('Memory not found.');
      m.deleted = false;
      event('moment-restored', m.id, 'restored a memory');
      return { ok: true };
    }
    if (path === '/profile') {
      me.name = d.name;
      me.profile = { bio: d.bio, interests: d.interests, windows: d.windows };
      event('profile', me.id, 'updated their shared travel windows');
      return { ok: true };
    }
    if (path === '/plans' && method === 'POST') {
      valid(d);
      const p = plan(uid(), db.active, d);
      db.plans.unshift(p);
      event('plan-created', p.id, 'opened an invitation: ' + p.title);
      return structuredClone(p);
    }
    if ((match = path.match(/^\/plans\/([^/]+)$/)) && method === 'PUT') {
      const p = get(match[1]);
      own(p);
      if (d.revision !== p.revision) fail('This plan changed. Reopen it.');
      valid(d);
      if (
        d.capacity &&
        d.capacity < 1 + p.rsvps.filter((r) => r.status === 'joined').length
      )
        fail('Capacity cannot exclude people already joined.');
      Object.assign(p, d, { revision: p.revision + 1, updated: now() });
      event(
        'plan-changed',
        p.id,
        'changed ' + p.title + ' — joined friends should reconfirm',
      );
      return p;
    }
    if ((match = path.match(/^\/plans\/([^/]+)\/status$/))) {
      const p = get(match[1]);
      own(p);
      if (p.status !== 'open') fail('This plan is already closed.');
      p.status = d.status;
      p.revision++;
      event('plan-' + d.status, p.id, d.status + ' ' + p.title);
      return { ok: true };
    }
    if ((match = path.match(/^\/plans\/([^/]+)\/rsvp$/))) {
      const p = get(match[1]);
      if (p.hostId === db.active) fail('You are already hosting.');
      if (d.status === 'leave') {
        p.rsvps = p.rsvps.filter((r) => r.memberId !== db.active);
        event('rsvp-left', p.id, 'left an invitation');
        return { ok: true };
      }
      if (p.status !== 'open') fail('This invitation is closed.');
      if (d.revision !== p.revision)
        fail('The host changed this invitation. Read the latest details.');
      if (d.choice === 'all' && p.joinStyle === 'reunion')
        fail('Choose a meet-afterward option.', 422);
      if (d.choice !== 'all' && !p.segments.find((s) => s.id === d.choice))
        fail('Choose an available part.', 422);
      if (d.status === 'joined') {
        if (
          p.capacity &&
          1 +
            p.rsvps.filter(
              (r) => r.status === 'joined' && r.memberId !== db.active,
            ).length >=
            p.capacity
        )
          fail('This plan is full. Join its waitlist instead.');
        const [day, st, en] = interval(p, d.choice);
        const conflicts = db.plans.filter((o) => {
          if (o.id === p.id || o.status !== 'open') return false;
          const r = o.rsvps.find(
            (r) => r.memberId === db.active && r.status === 'joined',
          );
          if (o.hostId !== db.active && !r) return false;
          const [od, os, oe] = interval(o, r?.choice);
          return od === day && st < oe && os < en;
        });
        if (conflicts.length && !d.acknowledgeConflict)
          fail({
            code: 'overlap',
            message:
              'This overlaps a plan you joined or host. Choose a shorter part, or explicitly accept the overlap.',
            plans: conflicts.map((p) => p.title),
          });
      }
      p.rsvps = p.rsvps.filter((r) => r.memberId !== db.active);
      p.rsvps.push({
        memberId: db.active,
        choice: d.choice,
        status: d.status,
        acceptedRevision: p.revision,
        updated: now(),
      });
      event(
        'rsvp',
        p.id,
        (d.status === 'joined' ? 'joined ' : 'is ' + d.status + ' in ') +
          p.title,
      );
      return { ok: true };
    }
    if ((match = path.match(/^\/plans\/([^/]+)\/comments$/))) {
      const p = get(match[1]);
      const c = {
        id: uid(),
        memberId: db.active,
        text: d.text,
        created: now(),
      };
      p.comments.push(c);
      event('comment', p.id, 'left a message on a plan');
      return c;
    }
    if ((match = path.match(/^\/comments\/([^/]+)$/)) && method === 'DELETE') {
      for (const p of db.plans) {
        const c = p.comments.find((c) => c.id === match[1]);
        if (c) {
          if (c.memberId !== db.active && me.role !== 'owner')
            fail('Only the author can remove this.', 403);
          p.comments = p.comments.filter((x) => x.id !== c.id);
          event('comment-deleted', p.id, 'removed a message');
        }
      }
      return { ok: true };
    }
    if (path === '/picks') {
      db.picks = db.picks.filter(
        (p) => !(p.memberId === db.active && p.catalogueId === d.catalogueId),
      );
      if (!d.remove)
        db.picks.push({
          memberId: db.active,
          catalogueId: d.catalogueId,
          shared: d.shared ? 1 : 0,
        });
      event('pick', d.catalogueId, 'updated a discovery', db.active);
      return { ok: true };
    }
    if (path === '/photos') {
      const id = uid();
      db.photos[id] = d.data;
      if (!persist()) {
        delete db.photos[id];
        fail(
          'The local example’s photo budget is full. The hosted service stores photos separately.',
        );
      }
      return { id };
    }
    if (path === '/moments' && method === 'POST') {
      const m = {
        ...d,
        id: uid(),
        memberId: db.active,
        revision: 1,
        created: now(),
        updated: now(),
      };
      db.moments.unshift(m);
      event(
        'moment',
        m.id,
        'added a memory',
        d.visibility === 'group' ? 'group' : db.active,
      );
      return { id: m.id };
    }
    if ((match = path.match(/^\/moments\/([^/]+)$/))) {
      const m = db.moments.find((x) => x.id === match[1]);
      if (!m) fail('Memory not found.', 404);
      if (m.memberId !== db.active)
        fail('Only the author can change this memory.', 403);
      if (method === 'DELETE') {
        m.deleted = true;
        m.updated = now();
      } else {
        if (m.revision !== d.revision) fail('Memory changed elsewhere.');
        Object.assign(m, d, { revision: m.revision + 1, updated: now() });
      }
      event('moment-edited', m.id, 'updated a memory', db.active);
      return { ok: true };
    }
    if (path === '/read') {
      db.readSeq = db.seq;
      persist();
      return { ok: true };
    }
    if (path === '/export')
      return {
        ...snap(),
        schemaVersion: 3,
        exportNotice:
          'Local example snapshot. Fictional people; not a real group trip.',
      };
    if (path === '/import-legacy') {
      const old = d.backup;
      if (old?.version !== 1 || !Array.isArray(old.saved))
        fail('Use a v1 fieldbook backup.', 422);
      const key = JSON.stringify(old);
      if (db.imports.includes(key))
        return { imported: 0, alreadyImported: true };
      let n = 0;
      for (const cid of old.saved)
        if (
          window.OMAKASE.catalogue.some((a) => a.id === cid) &&
          !db.picks.some(
            (p) => p.memberId === db.active && p.catalogueId === cid,
          )
        ) {
          db.picks.push({ memberId: db.active, catalogueId: cid, shared: 0 });
          n++;
        }
      db.imports.push(key);
      event('import', db.active, 'imported private saved ideas', db.active);
      return { imported: n };
    }
    fail(
      'This needs a hosted trip. The example never sends invitations or impersonates a shared server.',
      400,
    );
  }
  return {
    load,
    snap,
    call,
    switchTo(id) {
      if (db.members.some((m) => m.id === id)) {
        db.active = id;
        persist();
      }
      return snap();
    },
    reset() {
      db = initial();
      persist();
      return snap();
    },
    photo(id) {
      return db.photos[id] || '';
    },
  };
})();
