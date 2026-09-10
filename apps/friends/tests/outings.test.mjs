import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const sandbox = { window: {}, URL };
runInNewContext(
  await readFile(new URL('../public/data.js', import.meta.url), 'utf8'),
  sandbox,
);
runInNewContext(
  await readFile(new URL('../public/outings.js', import.meta.url), 'utf8'),
  sandbox,
);
const { catalogue, collections } = sandbox.window.OMAKASE;
const model = sandbox.window.OmakaseOutingModel;
const trip = { start: '2026-10-01', end: '2026-10-14' };
const collection = (id = 'naha-sakaemachi-evening') =>
  collections.find((item) => item.id === id);
const make = (id) => model.createDraft(collection(id), catalogue, '2026-10-06');
const plain = (value) => JSON.parse(JSON.stringify(value));
const escape = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

test('every curated collection produces a bounded day draft without inventing meeting points or reservations', () => {
  for (const c of collections) {
    const d = make(c.id);
    const result = model.evaluate(d, trip);
    assert.deepEqual(plain(result.errors), [], c.id);
    assert.ok(result.timeline.length <= 5);
    assert.equal(result.missingMeetings, result.timeline.length);
    const invitation = model.toInvitation(d, c, catalogue, trip);
    assert.equal(invitation.kind, 'idea');
    assert.equal(invitation.booking, 'check');
    assert.equal(
      invitation.catalogueId,
      '',
      'a multi-stop plan must not pretend to be a single discovery',
    );
    assert.equal(invitation.meeting, '');
    assert.ok(invitation.description.length <= 3000);
    assert.ok(invitation.description.includes('Fieldbook sources:'));
    assert.equal(invitation.segments.length, result.timeline.length);
    if (c.travelScale === 'separate-stay')
      assert.equal(
        result.timeline.length,
        1,
        'multi-day collections start with one day, not a rushed island itinerary',
      );
  }
});

test('removing and reordering stops recomputes travel allowances without changing part identities', () => {
  const d = make();
  d.start = '18:00';
  d.stops[0].minutes = 60;
  d.stops[1].minutes = 45;
  d.stops[1].gap = 20;
  let value = model.evaluate(d, trip);
  assert.equal(value.end, '20:05');
  assert.equal(value.travelMinutes, 20);
  const id = d.stops[1].segmentId;
  d.stops.reverse();
  d.stops[1].gap = 10;
  value = model.evaluate(d, trip);
  assert.equal(value.timeline[0].segmentId, id);
  assert.equal(value.timeline[0].start, '18:00');
  assert.equal(value.end, '19:55');
  d.stops[1].included = false;
  value = model.evaluate(d, trip);
  assert.equal(value.end, '18:45');
  assert.equal(
    value.travelMinutes,
    0,
    'there is no transfer before the only stop',
  );
});

test('midnight, impossible dates, empty selections, missing times and invalid durations cannot become invitations', () => {
  for (const edit of [
    (d) => {
      d.start = '23:45';
    },
    (d) => {
      d.start = '25:00';
    },
    (d) => {
      d.start = '';
    },
    (d) => {
      d.date = '2026-02-30';
    },
    (d) => {
      d.date = '2026-10-31';
    },
    (d) => {
      d.stops.forEach((stop) => {
        stop.included = false;
      });
    },
    (d) => {
      d.stops[0].minutes = '';
    },
    (d) => {
      d.stops[0].minutes = -10;
    },
    (d) => {
      d.stops[0].minutes = 10.5;
    },
    (d) => {
      d.stops[1].gap = -1;
    },
    (d) => {
      d.stops[1].gap = 'unknown';
    },
    (d) => {
      d.finishBy = '18:30';
    },
    (d) => {
      d.finishBy = '01:00';
    },
  ]) {
    const d = make();
    edit(d);
    assert.ok(model.evaluate(d, trip).errors.length);
    assert.throws(() => model.toInvitation(d, collection(), catalogue, trip));
  }
});

test('a restored private draft keeps edits and order but cannot add unknown stops or reuse forged segment IDs', () => {
  const d = make();
  d.title = 'Our quiet evening';
  d.notes = 'No rush';
  d.stops.reverse();
  d.stops[0].meeting = 'Synthetic public entrance';
  d.stops[0].segmentId = 'all';
  d.stops.push({ id: 'unknown', included: true });
  const restored = model.restoreDraft(d, collection(), catalogue, '2026-10-07');
  assert.equal(restored.title, 'Our quiet evening');
  assert.equal(restored.date, '2026-10-06');
  assert.equal(restored.stops[0].id, 'okinawa-010');
  assert.equal(restored.stops[0].meeting, 'Synthetic public entrance');
  assert.equal(restored.stops[0].segmentId, 'outing-okinawa-010');
  assert.equal(restored.stops.length, 2);
  assert.equal(
    model.restoreDraft(
      { ...d, collectionId: 'other' },
      collection(),
      catalogue,
      '2026-10-07',
    ).title,
    collection().title,
  );
});

test('selected stops, personal note and fallback survive conversion into the existing plan contract', () => {
  const d = make();
  d.notes = 'Dinner and a little wandering.';
  d.fallback = 'If tired, finish after dinner.';
  d.stops.forEach((stop, i) => {
    stop.meeting = `Synthetic entrance ${i + 1}`;
  });
  const plan = model.toInvitation(d, collection(), catalogue, trip);
  assert.equal(plan.meeting, 'Synthetic entrance 1');
  assert.equal(plan.segments[1].meeting, 'Synthetic entrance 2');
  assert.match(plan.description, /Dinner and a little wandering/);
  assert.match(plan.description, /If plans change: If tired/);
  assert.match(plan.description, /not a checked journey time/);
  assert.match(plan.description, /tabelog.com/);
  assert.match(plan.description, /explore-sakaemachi/);
  d.stops[0].included = false;
  const smaller = model.toInvitation(d, collection(), catalogue, trip);
  assert.equal(smaller.segments.length, 1);
  assert.equal(smaller.meeting, 'Synthetic entrance 2');
  assert.match(smaller.mapLink, /maps\/search/);
});

test('map searches encode user text and do not manufacture checked travel durations', () => {
  const url = new URL(model.directionURL('A & B, Osaka', 'C # 1, Osaka'));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('origin'), 'A & B, Osaka');
  assert.equal(url.searchParams.get('destination'), 'C # 1, Osaka');
  assert.equal(
    url.searchParams.has('travelmode'),
    false,
    'a walk must not be assumed for island or regional routes',
  );
});

test('day sheets escape hostile content and omit identities, access credentials and remote assets', () => {
  const plan = {
    ...model.toInvitation(make(), collection(), catalogue, trip),
    title: '<script>alert(1)</script>',
    status: 'open',
    revision: 3,
    description:
      'A note <img src=x onerror=alert(1)>\nhttps://example.com/guide',
    mapLink: 'javascript:alert(1)',
    hostId: 'SECRET_HOST',
    rsvps: [{ memberId: 'SECRET_GUEST' }],
    inviteToken: 'SECRET_INVITE',
    profile: { room: 'PRIVATE_ROOM' },
  };
  const html = model.daySheet(plan, escape, '2026-09-09T12:00:00Z');
  for (const secret of [
    'SECRET_HOST',
    'SECRET_GUEST',
    'SECRET_INVITE',
    'PRIVATE_ROOM',
  ])
    assert.equal(html.includes(secret), false);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img '), false);
  assert.equal(html.includes('javascript:'), false);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /revision 3/);
  assert.match(html, /This copy will not update/);
  assert.match(html, /href="https:\/\/example.com\/guide"/);
  assert.equal((html.match(/<script/g) || []).length, 0);
});
