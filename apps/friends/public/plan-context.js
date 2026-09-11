/* Shared, deterministic plan meaning. No DOM, providers, I/O or mutable state.
 * The classic-script export serves the browser, local example and Worker alike. */
'use strict';
(() => {
  const labels = Object.freeze({
    hosting: 'Hosting',
    tentative: 'Considering this',
    joined: 'Coming',
    interested: 'Interested, not committed',
    waitlist: 'Waiting for a place',
    declined: 'Sitting this out',
    unanswered: 'No reply',
  });
  function terms(plan, choice = 'all') {
    const part =
      choice === 'all'
        ? plan
        : (plan.segments || []).find((s) => s.id === choice);
    return {
      title: plan.title,
      region: plan.region,
      area: plan.area,
      date: plan.date,
      start: part?.start ?? null,
      end: part?.end ?? null,
      meeting: part?.meeting ?? null,
      part: choice === 'all' ? 'All of it' : (part?.label ?? null),
      kind: plan.kind,
      joinStyle: plan.joinStyle || 'open',
      catalogueId: plan.catalogueId || null,
      cost: plan.cost || null,
      costLimit: plan.costLimit ?? null,
      booking: plan.booking || 'check',
      capacity: plan.capacity ?? null,
      effort: plan.effort || 'easy',
      mapLink: plan.mapLink || null,
    };
  }
  function project(plan, memberId) {
    const host = plan.hostId === memberId;
    const reply = (plan.rsvps || []).find((r) => r.memberId === memberId);
    const status = host
      ? plan.kind === 'idea'
        ? 'tentative'
        : 'hosting'
      : reply?.status || 'unanswered';
    const joined = (plan.rsvps || []).filter((r) => r.status === 'joined');
    const solo = plan.joinStyle === 'solo';
    const open = plan.status === 'open';
    const choice = host ? 'all' : reply?.choice || 'all';
    const current = terms(plan, choice);
    const accepted =
      reply?.status === 'joined' && reply.acceptedPlan
        ? terms(reply.acceptedPlan, reply.choice)
        : null;
    const needsReconfirmation =
      open &&
      reply?.status === 'joined' &&
      reply.acceptedRevision !== plan.revision;
    const changes = accepted
      ? Object.keys(current)
          .filter((key) => current[key] !== accepted[key])
          .map((field) => ({
            field,
            before: accepted[field],
            after: current[field],
          }))
      : [];
    const full =
      plan.capacity != null &&
      1 + joined.length >= plan.capacity &&
      status !== 'joined';
    const options = solo
      ? []
      : [
          ...(plan.joinStyle !== 'reunion'
            ? [
                {
                  id: 'all',
                  label: 'All of it',
                  start: plan.start,
                  end: plan.end,
                  meeting: plan.meeting,
                },
              ]
            : []),
          ...(plan.segments || []),
        ];
    return {
      participation: solo
        ? 'solo'
        : plan.joinStyle === 'reunion'
          ? 'meet-afterward'
          : 'open',
      participationLabel: solo
        ? 'Solo time · a shared heads-up'
        : plan.joinStyle === 'reunion'
          ? 'Solo first · meet afterward'
          : 'Company welcome',
      response: status,
      responseLabel: labels[status],
      acceptedRevision: reply?.acceptedRevision ?? null,
      needsReconfirmation,
      current,
      accepted,
      changes,
      notesChanged:
        !!accepted &&
        (reply.acceptedPlan.description || '') !== (plan.description || ''),
      options,
      // An idea occupies a tentative planning window; it is not confirmed attendance.
      scheduleHold:
        open && (host || status === 'joined')
          ? host && plan.kind === 'idea'
            ? 'tentative'
            : needsReconfirmation
              ? 'needs-reconfirmation'
              : 'committed'
          : null,
      missingPart: !host && status === 'joined' && !current.start,
      full,
      joinedCount: joined.length,
      responses: (plan.rsvps || []).map((r) => ({
        memberId: r.memberId,
        status: r.status,
        label: labels[r.status],
        choice: r.status === 'declined' ? null : r.choice,
        needsReconfirmation:
          open && r.status === 'joined' && r.acceptedRevision !== plan.revision,
      })),
      actions: !open
        ? []
        : host
          ? ['edit', 'complete', 'cancel']
          : solo
            ? reply
              ? ['clear-reply']
              : []
            : [
                full ? 'waitlist' : needsReconfirmation ? 'reconfirm' : 'join',
                'interested',
                'decline',
                ...(reply ? ['clear-reply'] : []),
              ],
    };
  }
  globalThis.OmakasePlanContext = Object.freeze({ project, terms, labels });
})();
