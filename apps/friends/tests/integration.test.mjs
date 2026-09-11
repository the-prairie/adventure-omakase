import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker, { cleanup } from '../build/worker.js';
import { makeEnv, ROOT } from './local-bindings.mjs';
const contexts = [];
async function fixture(options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'omakase-'));
  const env = makeEnv(dir, options);
  contexts.push({ dir, env });
  return {
    dir,
    env,
    call: async (
      path,
      { method = 'GET', data, cookie = '', headers = {} } = {},
    ) => {
      const req = new Request('https://trip.example/api' + path, {
        method,
        headers: {
          'X-Omakase': '1',
          'Content-Type': 'application/json',
          Origin: 'https://trip.example',
          Cookie: cookie,
          ...headers,
        },
        ...(method !== 'GET' ? { body: JSON.stringify(data || {}) } : {}),
      });
      const res = await worker.fetch(req, env, {
        waitUntil: (p) => p.catch(console.error),
      });
      const text = await res.text();
      let value;
      try {
        value = JSON.parse(text);
      } catch {
        value = text;
      }
      return {
        status: res.status,
        data: value,
        cookie: res.headers.get('set-cookie')?.split(';')[0] || cookie,
        headers: res.headers,
      };
    },
  };
}
async function owner(f, name = 'Lauren') {
  const r = await f.call('/trips', {
    method: 'POST',
    data: { name, title: 'Japan with friends', hostKey: f.env.SETUP_KEY },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r;
}
async function friend(f, o, name = 'Mina') {
  const inv = await f.call('/invite', { cookie: o.cookie });
  const r = await f.call('/join', {
    method: 'POST',
    data: { name, token: inv.data.token },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r;
}
const proposal = (extra = {}) => ({
  title: 'River run, coffee afterward',
  region: 'osaka',
  area: 'Kitahama',
  date: '2026-10-04',
  start: '07:00',
  end: '10:00',
  meeting: 'Bridge on the park side',
  kind: 'going',
  joinStyle: 'reunion',
  capacity: 3,
  segments: [
    {
      id: 'coffee',
      label: 'Just the coffee',
      start: '09:00',
      end: '10:00',
      meeting: 'Meet at the park entrance',
    },
  ],
  requestId: crypto.randomUUID(),
  ...extra,
});
async function createPlan(f, o, extra = {}) {
  const r = await f.call('/plans', {
    method: 'POST',
    cookie: o.cookie,
    data: proposal(extra),
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}
const memory = (extra = {}) => ({
  title: 'The small thing',
  text: 'We found a tiny shop on our different walks.',
  date: '2026-10-04',
  region: 'osaka',
  photos: [],
  ...extra,
});
after(async () => {
  for (const c of contexts) {
    try {
      c.env.DB.close();
    } catch {
      /* Best-effort fallback; canonical server state is unchanged. */
    }
    await rm(c.dir, { recursive: true, force: true });
  }
});

test('health is real, setup is guarded and once-only', async () => {
  const f = await fixture();
  let r = await f.call('/health');
  assert.equal(r.data.setupRequired, true);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.platform, 'cloudflare');
  r = await f.call('/trips', { method: 'POST', data: { name: 'Other' } });
  assert.equal(r.status, 403);
  const o = await owner(f);
  assert.equal(o.data.members.length, 1);
  assert.equal(o.data.plans.length, 0);
  assert.equal(o.data.moments.length, 0);
  assert.equal(o.data.recoveryKey, undefined);
  assert.match(o.headers.get('set-cookie'), /HttpOnly.*SameSite=Lax.*Secure/);
  r = await f.call('/trips', {
    method: 'POST',
    data: { name: 'Other', hostKey: f.env.SETUP_KEY },
  });
  assert.equal(r.status, 409);
  assert.equal((await f.call('/health')).data.setupRequired, false);
});
test('one reusable link; name-only join; sessions remember each friend', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    b = await friend(f, a, 'Jo');
  assert.equal(b.data.members.length, 3);
  assert.equal(a.data.me.name, 'Mina');
  assert.equal(
    (await f.call('/state', { cookie: a.cookie })).data.me.id,
    a.data.me.id,
  );
  assert.equal((await f.call('/state')).status, 401);
  assert.equal(
    (await f.call('/invite', { cookie: a.cookie })).data.token,
    (await f.call('/invite', { cookie: o.cookie })).data.token,
  );
});
test('duplicate display names do not accidentally impersonate a friend', async () => {
  const f = await fixture(),
    o = await owner(f),
    inv = await f.call('/invite', { cookie: o.cookie });
  const r = await f.call('/join', {
    method: 'POST',
    data: { name: 'lauren', token: inv.data.token },
  });
  assert.equal(r.status, 409);
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.members.length,
    1,
  );
});
test('double-clicking the link on a remembered device does not create another person', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    inv = await f.call('/invite', { cookie: o.cookie });
  const r = await f.call('/join', {
    method: 'POST',
    cookie: a.cookie,
    data: { name: 'Different', token: inv.data.token },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.me.id, a.data.me.id);
  assert.equal(r.data.members.length, 2);
});
test('any member can invite; only owner replaces the link; existing sessions remain', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    old = (await f.call('/invite', { cookie: a.cookie })).data.token;
  assert.equal(
    (await f.call('/invite/rotate', { method: 'POST', cookie: a.cookie }))
      .status,
    403,
  );
  const updated = await f.call('/invite/rotate', {
    method: 'POST',
    cookie: o.cookie,
  });
  assert.notEqual(updated.data.token, old);
  assert.equal(
    (
      await f.call('/join', {
        method: 'POST',
        data: { name: 'Jo', token: old },
      })
    ).status,
    403,
  );
  assert.equal((await f.call('/state', { cookie: a.cookie })).status, 200);
});
test('another-device link restores the same identity, not another membership', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    key = await f.call('/device-link', { method: 'POST', cookie: a.cookie });
  const r = await f.call('/recover', {
    method: 'POST',
    data: { key: key.data.key },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.me.id, a.data.me.id);
  assert.notEqual(r.cookie, a.cookie);
  assert.equal(r.data.members.length, 2);
});
test('a member cannot create a device link for someone else', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  assert.equal(
    (
      await f.call('/device-link', {
        method: 'POST',
        cookie: a.cookie,
        data: { memberId: o.data.me.id },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.call('/device-link', {
        method: 'POST',
        cookie: o.cookie,
        data: { memberId: a.data.me.id },
      })
    ).status,
    200,
  );
});
test('individual dates and regions remain independent', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const data = {
    name: 'Mina',
    windows: [
      { region: 'okinawa', area: 'Aka', from: '2026-10-10', to: '2026-10-14' },
    ],
    bio: 'A slower morning',
    interests: 'Water',
  };
  assert.equal(
    (await f.call('/profile', { method: 'PUT', cookie: a.cookie, data }))
      .status,
    200,
  );
  const s = (await f.call('/state', { cookie: o.cookie })).data;
  assert.equal(s.me.profile.windows, undefined);
  assert.equal(
    s.members.find((m) => m.id === a.data.me.id).profile.windows[0].area,
    'Aka',
  );
  assert.equal(
    (
      await f.call('/profile', {
        method: 'PUT',
        cookie: a.cookie,
        data: { ...data, windows: [{ ...data.windows[0], to: '2026-10-01' }] },
      })
    ).status,
    422,
  );
});
test('custom invitation needs no catalogue or permission from an organizer', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, a);
  assert.equal(p.hostId, a.data.me.id);
  assert.equal(p.catalogueId, '');
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.plans[0].id,
    p.id,
  );
});
test('solo first prevents joining the run; coffee is a separate commitment', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, o);
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: a.cookie,
        data: { choice: 'all', status: 'joined', revision: 1 },
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: a.cookie,
        data: { choice: 'coffee', status: 'joined', revision: 1 },
      })
    ).status,
    200,
  );
  const c = f.env.DB.db
    .prepare('SELECT * FROM commitments WHERE member_id=?')
    .get(a.data.me.id);
  assert.equal(c.start, '09:00');
  assert.equal(c.end, '10:00');
  assert.equal(
    (await f.call('/state', { cookie: a.cookie })).data.plans[0].rsvps[0]
      .choice,
    'coffee',
  );
});
test('interested is not joined; leaving needs no explanation', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, o);
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { choice: 'coffee', status: 'interested', revision: 1 },
  });
  assert.equal(
    f.env.DB.db
      .prepare('SELECT count(*) AS n FROM commitments WHERE member_id=?')
      .get(a.data.me.id).n,
    0,
  );
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'leave' },
  });
  assert.equal(
    (await f.call('/state', { cookie: a.cookie })).data.plans[0].rsvps.length,
    0,
  );
});
test('concurrent requests for the last place yield exactly one join', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    b = await friend(f, o, 'Jo'),
    p = await createPlan(f, o, { capacity: 2 });
  const responses = await Promise.all(
    [a, b].map((x) =>
      f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: x.cookie,
        data: { status: 'joined', choice: 'coffee', revision: 1 },
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    f.env.DB.db
      .prepare("SELECT count(*) n FROM rsvps WHERE status='joined'")
      .get().n,
    1,
  );
});
test('waitlist does not automatically fill an available place', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    b = await friend(f, o, 'Jo'),
    p = await createPlan(f, o, { capacity: 2 });
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { choice: 'coffee', status: 'joined', revision: 1 },
  });
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: b.cookie,
    data: { choice: 'coffee', status: 'waitlist', revision: 1 },
  });
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'leave' },
  });
  assert.equal(
    (await f.call('/state', { cookie: b.cookie })).data.plans[0].rsvps[0]
      .status,
    'waitlist',
  );
});
test('edit retains old accepted revision and requires reconfirmation', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, o);
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { choice: 'coffee', status: 'joined', revision: 1 },
  });
  const d = {
    ...p,
    revision: 1,
    segments: [{ ...p.segments[0], meeting: 'New entrance' }],
  };
  assert.equal(
    (
      await f.call('/plans/' + p.id, {
        method: 'PUT',
        cookie: o.cookie,
        data: d,
      })
    ).status,
    200,
  );
  let s = (await f.call('/state', { cookie: a.cookie })).data.plans[0];
  assert.equal(s.revision, 2);
  assert.equal(s.rsvps[0].acceptedRevision, 1);
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: a.cookie,
        data: { choice: 'coffee', status: 'joined', revision: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: a.cookie,
        data: { choice: 'coffee', status: 'joined', revision: 2 },
      })
    ).status,
    200,
  );
});
test('two stale host edits cannot overwrite each other', async () => {
  const f = await fixture(),
    o = await owner(f),
    p = await createPlan(f, o);
  const rs = await Promise.all(
    ['A', 'B'].map((title) =>
      f.call('/plans/' + p.id, {
        method: 'PUT',
        cookie: o.cookie,
        data: { ...p, title, revision: 1 },
      }),
    ),
  );
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.plans[0].revision,
    2,
  );
});
test('capacity cannot be reduced below people who already joined', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    b = await friend(f, o, 'Jo'),
    p = await createPlan(f, o);
  for (const x of [a, b])
    await f.call('/plans/' + p.id + '/rsvp', {
      method: 'POST',
      cookie: x.cookie,
      data: { choice: 'coffee', status: 'joined', revision: 1 },
    });
  assert.equal(
    (
      await f.call('/plans/' + p.id, {
        method: 'PUT',
        cookie: o.cookie,
        data: { ...p, capacity: 2, revision: 1 },
      })
    ).status,
    409,
  );
});
test('concurrent host edit versus join never records an unseen revision', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, o);
  const rs = await Promise.all([
    f.call('/plans/' + p.id, {
      method: 'PUT',
      cookie: o.cookie,
      data: { ...p, title: 'Revised', revision: 1 },
    }),
    f.call('/plans/' + p.id + '/rsvp', {
      method: 'POST',
      cookie: a.cookie,
      data: { choice: 'coffee', status: 'joined', revision: 1 },
    }),
  ]);
  assert.equal(rs[0].status, 200);
  const s = (await f.call('/state', { cookie: a.cookie })).data.plans[0];
  assert.equal(s.revision, 2);
  if (rs[1].status === 200) assert.equal(s.rsvps[0].acceptedRevision, 1);
  else assert.equal(rs[1].status, 409);
});
test('overlap check uses chosen reunion time, not the full outing', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  await createPlan(f, a, {
    title: 'My own morning',
    start: '07:00',
    end: '08:00',
    joinStyle: 'open',
    segments: [],
  });
  const p = await createPlan(f, o);
  const r = await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { choice: 'coffee', status: 'joined', revision: 1 },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
});
test('genuine overlapping commitments need explicit acknowledgement', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  await createPlan(f, a, {
    title: 'Other coffee',
    start: '09:15',
    end: '10:00',
    joinStyle: 'open',
    segments: [],
  });
  const p = await createPlan(f, o);
  const payload = { choice: 'coffee', status: 'joined', revision: 1 };
  const r = await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: payload,
  });
  assert.equal(r.status, 409);
  assert.equal(r.data.detail.code, 'overlap');
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: a.cookie,
        data: { ...payload, acknowledgeConflict: true },
      })
    ).status,
    200,
  );
});
test('cancelled plans stay visible and cannot be joined', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, o);
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/status', {
        method: 'POST',
        cookie: o.cookie,
        data: { status: 'cancelled', revision: 1 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.call('/plans/' + p.id + '/rsvp', {
        method: 'POST',
        cookie: a.cookie,
        data: { choice: 'coffee', status: 'joined', revision: 2 },
      })
    ).status,
    409,
  );
  assert.equal(
    (await f.call('/state', { cookie: a.cookie })).data.plans[0].status,
    'cancelled',
  );
});
test('retrying a plan POST with the same request ID never duplicates', async () => {
  const f = await fixture(),
    o = await owner(f),
    data = proposal();
  const rs = await Promise.all(
    [1, 2].map(() =>
      f.call('/plans', { method: 'POST', cookie: o.cookie, data }),
    ),
  );
  assert.equal(rs[0].data.id, rs[1].data.id);
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.plans.length,
    1,
  );
});
test('invalid dates, segment times and dated catalogue conflicts reject cleanly', async () => {
  const f = await fixture(),
    o = await owner(f);
  for (const data of [
    proposal({ date: '2026-02-30' }),
    proposal({ date: '2026-11-01' }),
    proposal({
      segments: [
        {
          id: 'coffee',
          label: 'Late',
          meeting: 'X',
          start: '11:00',
          end: '12:00',
        },
      ],
    }),
    proposal({ segments: [] }),
  ])
    assert.equal(
      (await f.call('/plans', { method: 'POST', cookie: o.cookie, data }))
        .status,
      422,
    );
});
test('friends can add discoveries and turn them into invitations', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const find = await f.call('/discoveries', {
    method: 'POST',
    cookie: a.cookie,
    data: {
      title: 'The little pottery shop',
      region: 'osaka',
      area: 'Karahori',
      why: 'Recommended by a friend',
      category: 'craft',
      minutes: 45,
      source: 'https://example.org/shop',
    },
  });
  assert.equal(find.status, 201);
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.discoveries[0].memberId,
    a.data.me.id,
  );
  const p = await createPlan(f, a, { catalogueId: find.data.id });
  assert.equal(p.catalogueId, find.data.id);
});
test('unsafe links are rejected; ordinary URLs are accepted', async () => {
  const f = await fixture(),
    o = await owner(f);
  const r = await f.call('/discoveries', {
    method: 'POST',
    cookie: o.cookie,
    data: {
      title: 'Find',
      area: 'Osaka',
      why: 'Interesting',
      source: 'javascript:alert(1)',
    },
  });
  assert.equal(r.status, 422);
  assert.equal(
    (
      await f.call('/plans', {
        method: 'POST',
        cookie: o.cookie,
        data: proposal({ mapLink: 'https://user:pass@example.org' }),
      })
    ).status,
    422,
  );
});
test('saved ideas stay personal until recommended', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  await f.call('/picks', {
    method: 'POST',
    cookie: a.cookie,
    data: { catalogueId: 'osaka-005' },
  });
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.picks.length,
    0,
  );
  await f.call('/picks', {
    method: 'POST',
    cookie: a.cookie,
    data: { catalogueId: 'osaka-005', shared: true },
  });
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.picks[0].memberId,
    a.data.me.id,
  );
});
test('memories are shared by default, without a visibility questionnaire', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const r = await f.call('/moments', {
    method: 'POST',
    cookie: a.cookie,
    data: memory(),
  });
  assert.equal(r.status, 201);
  const m = (await f.call('/state', { cookie: o.cookie })).data.moments[0];
  assert.equal(m.visibility, 'group');
  assert.equal(m.memberId, a.data.me.id);
});
test('old private notes never become group-visible during edits', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const r = await f.call('/moments', {
    method: 'POST',
    cookie: a.cookie,
    data: memory({ visibility: 'private' }),
  });
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.moments.length,
    0,
  );
  await f.call('/moments/' + r.data.id, {
    method: 'PUT',
    cookie: a.cookie,
    data: memory({ revision: 1, text: 'Updated older private note' }),
  });
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.moments.length,
    0,
  );
  assert.equal(
    (await f.call('/state', { cookie: a.cookie })).data.moments[0].visibility,
    'private',
  );
});
test('removed memories can be restored without an old backup resurrecting everything', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const id = (
    await f.call('/moments', {
      method: 'POST',
      cookie: a.cookie,
      data: memory(),
    })
  ).data.id;
  await f.call('/moments/' + id, { method: 'DELETE', cookie: a.cookie });
  let s = (await f.call('/state', { cookie: a.cookie })).data;
  assert.equal(s.moments.length, 0);
  assert.equal(s.trash[0].id, id);
  assert.equal(
    (
      await f.call('/moments/' + id + '/restore', {
        method: 'POST',
        cookie: a.cookie,
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.moments[0].id,
    id,
  );
});
test('friends cannot rewrite someone else’s memory, owner can remove shared mistakes', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    b = await friend(f, o, 'Jo');
  const id = (
    await f.call('/moments', {
      method: 'POST',
      cookie: a.cookie,
      data: memory(),
    })
  ).data.id;
  assert.equal(
    (
      await f.call('/moments/' + id, {
        method: 'PUT',
        cookie: b.cookie,
        data: memory({ revision: 1 }),
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.call('/moments/' + id, { method: 'DELETE', cookie: o.cookie }))
      .status,
    200,
  );
});
test('photo uses object storage, strips metadata, and appears after attaching a memory', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  let bytes = new Uint8Array(
    await readFile(join(ROOT, 'public/assets/concrete.jpg')),
  );
  const exif = Buffer.from('Exif\0\0private-gps-test'),
    segment = Buffer.concat([
      Buffer.from([255, 225, 0, exif.length + 2]),
      exif,
    ]);
  bytes = Buffer.concat([bytes.subarray(0, 2), segment, bytes.subarray(2)]);
  const uploaded = await f.call('/photos', {
    method: 'POST',
    cookie: a.cookie,
    data: { data: 'data:image/jpeg;base64,' + bytes.toString('base64') },
  });
  assert.equal(uploaded.status, 201, JSON.stringify(uploaded.data));
  const id = uploaded.data.id;
  assert.equal(
    (await f.call('/photos/' + id, { cookie: o.cookie })).status,
    404,
  );
  await f.call('/moments', {
    method: 'POST',
    cookie: a.cookie,
    data: memory({ photos: [id] }),
  });
  const r = await f.call('/photos/' + id, { cookie: o.cookie });
  assert.equal(r.status, 200);
  const row = f.env.DB.db.prepare('SELECT * FROM photos WHERE id=?').get(id),
    object = await f.env.PHOTOS.get(row.object_key);
  const saved = Buffer.from(await object.arrayBuffer());
  assert.equal(saved.includes('private-gps-test'), false);
  assert.ok(saved.length < bytes.length);
});
test('invalid and oversized images fail without leaving a photo record', async () => {
  const f = await fixture(),
    o = await owner(f);
  for (const data of [
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/jpeg;base64,aGVsbG8=',
  ])
    assert.equal(
      (
        await f.call('/photos', {
          method: 'POST',
          cookie: o.cookie,
          data: { data },
        })
      ).status,
      422,
    );
  assert.equal(f.env.DB.db.prepare('SELECT count(*) n FROM photos').get().n, 0);
});
test('photo budget is enforced before storage and a failed R2 write rolls back metadata', async () => {
  const f = await fixture(),
    o = await owner(f);
  f.env.TRIP_PHOTO_BUDGET_MB = '0';
  const data =
    'data:image/jpeg;base64,' +
    (await readFile(join(ROOT, 'public/assets/concrete.jpg'))).toString(
      'base64',
    );
  assert.equal(
    (
      await f.call('/photos', {
        method: 'POST',
        cookie: o.cookie,
        data: { data },
      })
    ).status,
    409,
  );
  f.env.TRIP_PHOTO_BUDGET_MB = '500';
  const old = f.env.PHOTOS.put;
  f.env.PHOTOS.put = async () => {
    throw Error('Injected R2 failure');
  };
  assert.equal(
    (
      await f.call('/photos', {
        method: 'POST',
        cookie: o.cookie,
        data: { data },
      })
    ).status,
    500,
  );
  assert.equal(f.env.DB.db.prepare('SELECT count(*) n FROM photos').get().n, 0);
  f.env.PHOTOS.put = old;
});
test('polling returns no body without changes and a fresh snapshot when changed', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const s = (await f.call('/state', { cookie: a.cookie })).data;
  assert.equal(
    (await f.call('/sync?after=' + s.seq, { cookie: a.cookie })).status,
    204,
  );
  await createPlan(f, o);
  const r = await f.call('/sync?after=' + s.seq, { cookie: a.cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.plans.length, 1);
  assert.ok(r.data.seq > s.seq);
});
test('marking updates read does not mark unseen later updates', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const old = (await f.call('/state', { cookie: a.cookie })).data.seq;
  await createPlan(f, o);
  await f.call('/read', {
    method: 'POST',
    cookie: a.cookie,
    data: { seq: old },
  });
  const s = (await f.call('/state', { cookie: a.cookie })).data;
  assert.equal(s.readSeq, old);
  assert.ok(s.seq > s.readSeq);
});
test('legacy shortlist import is once-only and does not publish old notes', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    backup = {
      version: 1,
      saved: ['osaka-005', 'tokyo-001'],
      notes: [{ text: 'Private old note' }],
    };
  const r = await f.call('/import-legacy', {
    method: 'POST',
    cookie: a.cookie,
    data: { backup },
  });
  assert.equal(r.data.imported, 2);
  await f.call('/picks', {
    method: 'POST',
    cookie: a.cookie,
    data: { catalogueId: 'osaka-005', remove: true },
  });
  const repeat = await f.call('/import-legacy', {
    method: 'POST',
    cookie: a.cookie,
    data: { backup },
  });
  assert.equal(repeat.data.alreadyImported, true);
  const s = (await f.call('/state', { cookie: a.cookie })).data;
  assert.equal(s.picks.length, 1);
  assert.equal(s.moments.length, 0);
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.picks.length,
    0,
  );
});
test('removing a member revokes sessions and closes their open invitations', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  await createPlan(f, a);
  await f.call('/members/' + a.data.me.id, {
    method: 'DELETE',
    cookie: o.cookie,
  });
  assert.equal((await f.call('/state', { cookie: a.cookie })).status, 401);
  assert.equal(
    (await f.call('/state', { cookie: o.cookie })).data.plans[0].status,
    'cancelled',
  );
});
test('cross-origin mutations and uncredentialed administrative exports are refused', async () => {
  const f = await fixture(),
    o = await owner(f);
  assert.equal(
    (
      await f.call('/profile', {
        method: 'PUT',
        cookie: o.cookie,
        data: { name: 'changed' },
        headers: { Origin: 'https://other.example' },
      })
    ).status,
    403,
  );
  assert.equal((await f.call('/admin/backup')).status, 403);
  assert.equal(
    (
      await f.call('/admin/backup', {
        headers: { 'X-Setup-Key': f.env.SETUP_KEY },
      })
    ).status,
    200,
  );
});
test('a fresh database restore preserves real contributions and refuses overwrite', async () => {
  const f = await fixture(),
    o = await owner(f);
  await f.call('/moments', {
    method: 'POST',
    cookie: o.cookie,
    data: memory(),
  });
  const backup = (
    await f.call('/admin/backup', {
      headers: { 'X-Setup-Key': f.env.SETUP_KEY },
    })
  ).data;
  const dest = await fixture({ maintenance: true });
  const r = await dest.call('/admin/restore', {
    method: 'POST',
    headers: { 'X-Setup-Key': dest.env.SETUP_KEY },
    data: backup,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(
    dest.env.DB.db.prepare('SELECT count(*) n FROM moments').get().n,
    1,
  );
  assert.equal(
    (
      await dest.call('/admin/restore', {
        method: 'POST',
        headers: { 'X-Setup-Key': dest.env.SETUP_KEY },
        data: backup,
      })
    ).status,
    409,
  );
  assert.equal((await dest.call('/state')).status, 503);
});
test('SQLite and object files survive process-level adapter recreation', async () => {
  const f = await fixture(),
    o = await owner(f);
  await createPlan(f, o);
  f.env.DB.close();
  const env = makeEnv(f.dir);
  const r = await worker.fetch(
    new Request('https://trip.example/api/state', {
      headers: { Cookie: o.cookie },
    }),
    env,
    {
      waitUntil() {
        /* The adapter test has no queued background work. */
      },
    },
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).plans.length, 1);
  env.DB.close();
});

test('backup restores cancelled and unconfirmed RSVPs without rejoining them', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    p = await createPlan(f, o);
  await f.call('/plans/' + p.id + '/rsvp', {
    method: 'POST',
    cookie: a.cookie,
    data: { choice: 'coffee', status: 'joined', revision: 1 },
  });
  await f.call('/plans/' + p.id + '/status', {
    method: 'POST',
    cookie: o.cookie,
    data: { status: 'cancelled', revision: 1 },
  });
  const backup = (
      await f.call('/admin/backup', {
        headers: { 'X-Setup-Key': f.env.SETUP_KEY },
      })
    ).data,
    g = await fixture({ maintenance: true });
  const r = await g.call('/admin/restore', {
    method: 'POST',
    headers: { 'X-Setup-Key': g.env.SETUP_KEY },
    data: backup,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(
    g.env.DB.db.prepare('SELECT accepted_revision FROM rsvps').get()
      .accepted_revision,
    1,
  );
  assert.equal(
    g.env.DB.db.prepare('SELECT status FROM plans').get().status,
    'cancelled',
  );
  assert.equal(
    g.env.DB.db.prepare("SELECT 1 FROM app_meta WHERE key='restoring'").get(),
    undefined,
  );
});
test('cleanup deletes abandoned photos but leaves live and undo-window photos intact', async () => {
  const f = await fixture(),
    o = await owner(f);
  const data =
    'data:image/jpeg;base64,' +
    (await readFile(join(ROOT, 'public/assets/concrete.jpg'))).toString(
      'base64',
    );
  const ids = [];
  for (let i = 0; i < 3; i++)
    ids.push(
      (
        await f.call('/photos', {
          method: 'POST',
          cookie: o.cookie,
          data: { data },
        })
      ).data.id,
    );
  const live = (
      await f.call('/moments', {
        method: 'POST',
        cookie: o.cookie,
        data: memory({ photos: [ids[1]] }),
      })
    ).data.id,
    deleted = (
      await f.call('/moments', {
        method: 'POST',
        cookie: o.cookie,
        data: memory({ photos: [ids[2]] }),
      })
    ).data.id;
  assert.ok(live);
  await f.call('/moments/' + deleted, { method: 'DELETE', cookie: o.cookie });
  f.env.DB.db.exec("UPDATE photos SET created='2020-01-01T00:00:00.000Z'");
  await cleanup(f.env);
  assert.equal(f.env.DB.db.prepare('SELECT count(*) n FROM photos').get().n, 2);
  assert.equal(
    f.env.DB.db.prepare('SELECT * FROM photos WHERE id=?').get(ids[0]),
    undefined,
  );
  assert.equal(
    (
      await f.call('/moments/' + deleted + '/restore', {
        method: 'POST',
        cookie: o.cookie,
      })
    ).status,
    200,
  );
});
test('a photo claimed for deletion cannot be attached after a preliminary read', async () => {
  const f = await fixture(),
    o = await owner(f);
  const data =
      'data:image/jpeg;base64,' +
      (await readFile(join(ROOT, 'public/assets/concrete.jpg'))).toString(
        'base64',
      ),
    id = (
      await f.call('/photos', {
        method: 'POST',
        cookie: o.cookie,
        data: { data },
      })
    ).data.id;
  f.env.DB.db.prepare("UPDATE photos SET status='deleting' WHERE id=?").run(id);
  assert.throws(
    () =>
      f.env.DB.db
        .prepare(
          'INSERT INTO moments(id,trip_id,member_id,body,created,updated) VALUES(?,?,?,?,?,?)',
        )
        .run(
          'racy',
          o.data.trip.id,
          o.data.me.id,
          JSON.stringify(memory({ photos: [id] })),
          new Date().toISOString(),
          new Date().toISOString(),
        ),
    /photo_unavailable/,
  );
});
test('a full 300-item legacy shortlist is imported in a three-statement batch', async () => {
  const f = await fixture(),
    o = await owner(f);
  const all = JSON.parse(
    await readFile(join(ROOT, 'public/catalogue.json'), 'utf8'),
  );
  const ids = (Array.isArray(all) ? all : all.catalogue).map((d) => d.id);
  let max = 0;
  const b = f.env.DB.batch.bind(f.env.DB);
  f.env.DB.batch = async (s) => {
    max = Math.max(max, s.length);
    return b(s);
  };
  const r = await f.call('/import-legacy', {
    method: 'POST',
    cookie: o.cookie,
    data: { backup: { version: 1, saved: ids } },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.imported, 300);
  assert.ok(max <= 3);
});
test('operator owner-device link repairs access after restoring without sessions', async () => {
  const f = await fixture(),
    o = await owner(f);
  assert.equal(
    (await f.call('/admin/owner-device', { method: 'POST' })).status,
    403,
  );
  const r = await f.call('/admin/owner-device', {
    method: 'POST',
    headers: { 'X-Setup-Key': f.env.SETUP_KEY },
  });
  assert.equal(
    (await f.call('/recover', { method: 'POST', data: { key: r.data.key } }))
      .data.me.id,
    o.data.me.id,
  );
});

test('public map config exposes only the dedicated browser key', async () => {
  const f = await fixture();
  f.env.GOOGLE_MAPS_API_KEY = 'private-server-fixture';
  assert.deepEqual((await f.call('/maps/config')).data, { browserKey: null });
  f.env.GOOGLE_MAPS_BROWSER_KEY = 'restricted-browser-fixture';
  const response = await f.call('/maps/config');
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { browserKey: 'restricted-browser-fixture' });
  assert.equal(
    JSON.stringify(response.data).includes('private-server-fixture'),
    false,
  );
});

test('declining is canonical, reversible, revision guarded and separate from silence', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o),
    b = await friend(f, o, 'Avery');
  const p = await createPlan(f, o);
  let reply = await f.call(`/plans/${p.id}/rsvp`, {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'declined', revision: p.revision },
  });
  assert.equal(reply.status, 200, JSON.stringify(reply.data));
  let state = (await f.call('/state', { cookie: a.cookie })).data;
  assert.equal(state.plans[0].rsvps[0].status, 'declined');
  assert.equal(state.plans[0].comments.length, 0);
  assert.equal(
    f.env.DB.db
      .prepare('SELECT count(*) n FROM commitments WHERE member_id=?')
      .get(a.data.me.id).n,
    0,
  );
  const context = await f.call('/context?date=' + p.date, { cookie: a.cookie });
  assert.equal(context.status, 200);
  assert.equal(context.data.plans[0].response, 'declined');
  assert.deepEqual(context.data.plans[0].unansweredMemberIds, [b.data.me.id]);
  assert.equal(context.data.plans[0].scheduleHold, null);
  assert.equal(
    (
      await f.call(context.data.read.next.replace('/api', ''), {
        cookie: a.cookie,
      })
    ).status,
    204,
  );
  reply = await f.call(`/plans/${p.id}/rsvp`, {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'joined', choice: 'coffee', revision: p.revision },
  });
  assert.equal(reply.status, 200, JSON.stringify(reply.data));
  await f.call(`/plans/${p.id}`, {
    method: 'PUT',
    cookie: o.cookie,
    data: { ...p, title: 'Updated coffee', revision: p.revision },
  });
  assert.equal(
    (
      await f.call(`/plans/${p.id}/rsvp`, {
        method: 'POST',
        cookie: a.cookie,
        data: { status: 'declined', revision: p.revision },
      })
    ).status,
    409,
  );
  await f.call(`/plans/${p.id}/rsvp`, {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'leave' },
  });
  state = (await f.call('/state', { cookie: a.cookie })).data;
  assert.equal(state.plans[0].rsvps.length, 0);
});

test('solo heads-ups disable joining at the database boundary and preserve existing invitations', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const p = await createPlan(f, o, {
    joinStyle: 'solo',
    segments: [],
    capacity: null,
    costLimit: 0,
  });
  for (const status of ['joined', 'interested', 'waitlist', 'declined']) {
    const result = await f.call(`/plans/${p.id}/rsvp`, {
      method: 'POST',
      cookie: a.cookie,
      data: { status, choice: 'all', revision: 1 },
    });
    assert.equal(result.status, 409, JSON.stringify(result.data));
    assert.match(result.data.detail, /solo time/);
  }
  const context = (
    await f.call('/context?date=' + p.date, { cookie: a.cookie })
  ).data.plans[0];
  assert.equal(context.participation, 'solo');
  assert.deepEqual(context.actions, []);
  assert.equal(context.current.costLimit, 0);
  assert.equal(context.options.length, 0);
  const q = await createPlan(f, o, { date: '2026-10-05' });
  await f.call(`/plans/${q.id}/rsvp`, {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'interested', choice: 'coffee', revision: 1 },
  });
  const edit = await f.call(`/plans/${q.id}`, {
    method: 'PUT',
    cookie: o.cookie,
    data: { ...q, joinStyle: 'solo', segments: [], capacity: null },
  });
  assert.equal(edit.status, 409, JSON.stringify(edit.data));
  assert.equal(
    (await f.call(`/plans/${q.id}`, { cookie: a.cookie })).data.joinStyle,
    'reunion',
  );
});

test('acceptance receipts preserve the actual prior meeting and limit across edits and reconfirmation', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  const p = await createPlan(f, o, {
    costLimit: 1500,
    catalogueId: 'osaka-001',
  });
  await f.call(`/plans/${p.id}/rsvp`, {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'joined', choice: 'coffee', revision: 1 },
  });
  const edit = await f.call(`/plans/${p.id}`, {
    method: 'PUT',
    cookie: o.cookie,
    data: {
      ...p,
      costLimit: 2000,
      segments: [{ ...p.segments[0], meeting: 'East exit', start: '09:15' }],
    },
  });
  assert.equal(edit.status, 200, JSON.stringify(edit.data));
  let context = (await f.call('/context?date=' + p.date, { cookie: a.cookie }))
    .data.plans[0];
  assert.equal(context.needsReconfirmation, true);
  assert.equal(context.accepted.meeting, p.segments[0].meeting);
  assert.equal(context.accepted.costLimit, 1500);
  assert.equal(context.current.meeting, 'East exit');
  assert.equal(context.current.costLimit, 2000);
  assert.deepEqual(context.changes.map((c) => c.field).sort(), [
    'costLimit',
    'meeting',
    'start',
  ]);
  assert.equal(context.source.catalogueId, 'osaka-001');
  const answer = await f.call(`/plans/${p.id}/rsvp`, {
    method: 'POST',
    cookie: a.cookie,
    data: { status: 'joined', choice: 'coffee', revision: 2 },
  });
  assert.equal(answer.status, 200, JSON.stringify(answer.data));
  context = (await f.call('/context?date=' + p.date, { cookie: a.cookie })).data
    .plans[0];
  assert.equal(context.needsReconfirmation, false);
  assert.equal(context.accepted.meeting, 'East exit');
  assert.equal(context.acceptedRevision, 2);
});

test('compact context and bounded catalogue are authenticated, source-linked and member scoped', async () => {
  const f = await fixture(),
    o = await owner(f),
    a = await friend(f, o);
  assert.equal((await f.call('/context?date=2026-10-04')).status, 401);
  assert.equal((await f.call('/catalogue')).status, 401);
  assert.equal((await f.call('/context', { cookie: o.cookie })).status, 422);
  const places = await f.call('/catalogue?region=osaka&limit=2', {
    cookie: a.cookie,
  });
  assert.equal(places.status, 200, JSON.stringify(places.data));
  assert.equal(places.data.total, 100);
  assert.equal(places.data.places.length, 2);
  assert.equal(places.data.nextOffset, 2);
  const detail = await f.call('/catalogue?id=' + places.data.places[0].id, {
    cookie: a.cookie,
  });
  assert.equal(detail.data.total, 1);
  assert.ok(detail.data.places[0].source);
  assert.equal(
    (await f.call('/catalogue?limit=31', { cookie: a.cookie })).status,
    422,
  );
  await f.call('/moments', {
    method: 'POST',
    cookie: o.cookie,
    data: memory({ visibility: 'private', text: 'private-sentinel' }),
  });
  const context = await f.call('/context?date=2026-10-04', {
    cookie: a.cookie,
  });
  assert.ok(!JSON.stringify(context.data).includes('private-sentinel'));
  const invalid = await f.call('/plans', {
    method: 'POST',
    cookie: o.cookie,
    data: proposal({ costLimit: -1 }),
  });
  assert.equal(invalid.status, 422);
});
