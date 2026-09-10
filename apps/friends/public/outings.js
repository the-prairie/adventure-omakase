'use strict';
/* A private, editable day draft. Publication uses the existing invitation API. */
(() => {
  const clock = (value) => {
    if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
    const [h, m] = value.split(':').map(Number);
    return h < 24 && m < 60 ? h * 60 + m : null;
  };
  const time = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const duration = (minutes) =>
    [
      Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} hr` : '',
      minutes % 60 ? `${minutes % 60} min` : '',
    ]
      .filter(Boolean)
      .join(' ') || '0 min';
  const validDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const text = (value, max) =>
    typeof value === 'string' ? value.slice(0, max) : '';
  const integer = (value, min, max) =>
    value !== '' &&
    Number.isInteger(Number(value)) &&
    Number(value) >= min &&
    Number(value) <= max;
  const safeURL = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password
        ? url.href
        : '';
    } catch {
      return '';
    }
  };
  function createDraft(collection, catalogue, date) {
    const byId = new Map(catalogue.map((item) => [item.id, item]));
    return {
      version: 1,
      collectionId: collection.id,
      title: collection.title,
      date,
      start: collection.startSuggestion || '10:00',
      finishBy: '',
      notes: '',
      fallback: '',
      stops: collection.stops.map((stop, index) => {
        const place = byId.get(stop.catalogueId);
        if (!place)
          throw Error('An outing stop is no longer in the Fieldbook.');
        return {
          id: place.id,
          segmentId: `outing-${place.id}`,
          label: place.title.slice(0, 100),
          included: collection.travelScale !== 'separate-stay' || index === 0,
          minutes: Math.max(15, Math.min(360, place.minutes || 60)),
          gap: 20,
          meeting: '',
        };
      }),
    };
  }
  function restoreDraft(saved, collection, catalogue, date) {
    const fresh = createDraft(collection, catalogue, date);
    if (
      !saved ||
      saved.version !== 1 ||
      saved.collectionId !== collection.id ||
      !Array.isArray(saved.stops)
    )
      return fresh;
    const known = new Map(fresh.stops.map((stop) => [stop.id, stop]));
    const restored = [];
    for (const stop of saved.stops) {
      if (!stop || !known.has(stop.id)) continue;
      const base = known.get(stop.id);
      known.delete(stop.id);
      restored.push({
        ...base,
        included: stop.included === true,
        label: text(stop.label, 100) || base.label,
        meeting: text(stop.meeting, 500),
        minutes: integer(stop.minutes, 5, 720)
          ? Number(stop.minutes)
          : base.minutes,
        gap: integer(stop.gap, 0, 360) ? Number(stop.gap) : base.gap,
      });
    }
    return {
      ...fresh,
      title: text(saved.title, 150) || fresh.title,
      date: validDate(saved.date) ? saved.date : fresh.date,
      start: clock(saved.start) !== null ? saved.start : fresh.start,
      finishBy: clock(saved.finishBy) !== null ? saved.finishBy : '',
      notes: text(saved.notes, 500),
      fallback: text(saved.fallback, 300),
      stops: [...restored, ...known.values()],
    };
  }
  function evaluate(draft, trip = {}) {
    const errors = [];
    if (!draft.title.trim()) errors.push('Give this day a title.');
    if (!validDate(draft.date)) errors.push('Choose a valid day.');
    else if (
      (trip.start && draft.date < trip.start) ||
      (trip.end && draft.date > trip.end)
    )
      errors.push(
        `Choose a day within this trip (${trip.start} to ${trip.end}). The trip owner can extend its dates in their profile.`,
      );
    const start = clock(draft.start);
    if (start === null) errors.push('Choose a starting time.');
    const selected = draft.stops.filter((stop) => stop.included);
    if (!selected.length)
      errors.push('Keep at least one stop, or close this draft for later.');
    if (selected.length > 5)
      errors.push('Keep up to five stops in one invitation.');
    if (
      new Set(selected.map((stop) => stop.segmentId)).size !== selected.length
    )
      errors.push('Each stop must have a distinct meeting option.');
    const timeline = [];
    let cursor = start ?? 0,
      travelMinutes = 0;
    for (const [index, stop] of selected.entries()) {
      if (!stop.label.trim()) errors.push('Give each included stop a name.');
      if (!integer(stop.minutes, 5, 720))
        errors.push(
          `${stop.label || 'This stop'} needs between 5 and 720 whole minutes.`,
        );
      if (index && !integer(stop.gap, 0, 360))
        errors.push('Allow between 0 and 360 whole minutes between stops.');
      const gap = index && integer(stop.gap, 0, 360) ? Number(stop.gap) : 0;
      const minutes = integer(stop.minutes, 5, 720) ? Number(stop.minutes) : 0;
      cursor += gap;
      travelMinutes += gap;
      timeline.push({
        ...stop,
        gap,
        start: time(cursor),
        end: time(cursor + minutes),
      });
      cursor += minutes;
    }
    if (cursor >= 1440)
      errors.push(
        'This runs into the next day. Start earlier, shorten it, or make a separate daily invitation.',
      );
    const finish = draft.finishBy ? clock(draft.finishBy) : null;
    if (
      draft.finishBy &&
      (finish === null || (start !== null && finish <= start))
    )
      errors.push(
        'Your finish-by time must be after the start on the same day.',
      );
    else if (finish !== null && cursor > finish)
      errors.push(
        `This finishes ${duration(cursor - finish)} later than you wanted. Shorten a stop or leave one for another day.`,
      );
    return {
      errors: [...new Set(errors)],
      timeline,
      end: cursor < 1440 ? time(cursor) : '',
      totalMinutes: Math.max(0, cursor - (start ?? 0)),
      travelMinutes,
      missingMeetings: selected.filter((stop) => !stop.meeting.trim()).length,
    };
  }
  function directionURL(origin, destination) {
    if (!origin || !destination) return '';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  }
  function sourceLinks(collection, selected, catalogue) {
    const byId = new Map(catalogue.map((item) => [item.id, item]));
    const sources = [
      ...selected.map((stop) => {
        const place = byId.get(stop.id);
        return {
          label: place?.title,
          url: place?.experience?.source || place?.source,
        };
      }),
      ...(collection.sources || []),
    ];
    const seen = new Set();
    return sources
      .filter((source) => {
        const url = safeURL(source.url);
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .map((source) => ({ label: source.label, url: safeURL(source.url) }));
  }
  function toInvitation(draft, collection, catalogue, trip = {}) {
    const result = evaluate(draft, trip);
    if (result.errors.length) throw Error(result.errors[0]);
    const byId = new Map(catalogue.map((item) => [item.id, item]));
    if (result.timeline.some((stop) => !byId.has(stop.id)))
      throw Error('A stop is no longer in the Fieldbook.');
    const places = result.timeline.map((stop) => byId.get(stop.id));
    const sources = sourceLinks(collection, result.timeline, catalogue);
    const description = [
      draft.notes.trim() || collection.pitch,
      `Pace: ${collection.leaveRoom}`,
      `Draft travel allowance: ${result.travelMinutes} min between stops, not a checked journey time.`,
      collection.planning,
      places.some((place) => place.flags.includes('w'))
        ? 'Water activity: an operator must confirm conditions and suitability separately.'
        : '',
      places.some((place) => place.flags.includes('o'))
        ? 'Island transfers or a separate stay must be arranged separately.'
        : '',
      draft.fallback.trim() ? `If plans change: ${draft.fallback.trim()}` : '',
      'Opening, routes and bookings need checking. Nothing is reserved by this invitation.',
      'Fieldbook sources:',
      ...sources.map((source) => `${source.label}: ${source.url}`),
    ]
      .filter(Boolean)
      .join('\n\n');
    if (description.length > 3000)
      throw Error(
        'This invitation is too long. Shorten your note or choose fewer stops.',
      );
    const first = places[0];
    return {
      title: draft.title.trim(),
      region: collection.region,
      area: [...new Set(places.map((place) => place.area))]
        .join(' / ')
        .slice(0, 100),
      date: draft.date,
      start: draft.start,
      end: result.end,
      meeting: result.timeline[0].meeting,
      description,
      mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(first.mapQuery || `${first.title} ${first.area} Japan`)}`,
      cost: '',
      booking: 'check',
      kind: 'idea',
      joinStyle: 'open',
      effort: places.some(
        (place) => place.flags.includes('w') || place.mood === 'Move',
      )
        ? 'active'
        : 'easy',
      capacity: null,
      catalogueId: '',
      segments: result.timeline.map((stop) => ({
        id: stop.segmentId,
        label: stop.label,
        start: stop.start,
        end: stop.end,
        meeting: stop.meeting,
      })),
      _collectionId: collection.id,
    };
  }
  function linksInText(value, escape) {
    return String(value || '')
      .split(/(https:\/\/[^\s<>"']+)/g)
      .map((part) =>
        safeURL(part)
          ? `<a href="${escape(safeURL(part))}" target="_blank" rel="noopener noreferrer">${escape(part)}</a>`
          : escape(part),
      )
      .join('');
  }
  function daySheet(plan, escape, savedAt) {
    const parts = plan.segments?.length
      ? plan.segments
      : [
          {
            label: plan.title,
            start: plan.start,
            end: plan.end,
            meeting: plan.meeting,
          },
        ];
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(plan.title)} · day sheet</title><style>body{background:#f7f5ef;color:#26352e;font:17px/1.6 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 24px}h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.2}h1{font-size:36px}h2{font-size:25px}section{border-top:1px solid #b3bbae;padding:20px 0}.note{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#244b3b}small{font-size:14px}@media print{body{background:white;margin:0;max-width:none}section{break-inside:avoid}}</style><h1>${escape(plan.title)}</h1><p>${escape(plan.date)} · ${escape(plan.start)}–${escape(plan.end)} JST<br>${escape(plan.area)}</p><p><strong>Offline copy · ${escape(plan.status || 'open')}</strong><br><small>Saved ${escape(savedAt)} · revision ${escape(plan.revision || 1)}. This copy will not update. Check the live invitation for changes before meeting.</small></p><section><h2>Meet here</h2><p class="note">${escape(plan.meeting)}</p>${safeURL(plan.mapLink) ? `<a href="${escape(safeURL(plan.mapLink))}">Open map when connected</a>` : ''}</section>${parts.map((part) => `<section><h2>${escape(part.label)}</h2><p>${escape(part.start)}–${escape(part.end)} JST</p><p class="note">${escape(part.meeting)}</p></section>`).join('')}<section><h2>What to know</h2><p>Expected cost: ${escape(plan.cost || 'Not supplied')}<br>Booking: ${escape({ check: 'Still needs checking', 'not-needed': 'Host says no booking needed', 'host-booked': 'Host booked for themselves only' }[plan.booking] || 'Still needs checking')}</p><div class="note">${linksInText(plan.description, escape)}</div></section><p><small>Joining is not a booking. This file contains trip details; keep or share it deliberately. Group members, access links and private profiles are not included.</small></p></html>`;
  }
  window.OmakaseOutingModel = {
    createDraft,
    restoreDraft,
    evaluate,
    toInvitation,
    sourceLinks,
    directionURL,
    linksInText,
    daySheet,
    duration,
  };

  window.OmakaseOutings = function ({
    getState,
    getMode,
    getDay,
    getCatalogue,
    getCollections,
    escape: E,
    icon,
    openModal,
    openPlanForm,
    toast,
  }) {
    const dialog = document.getElementById('dialog');
    let draft = null,
      collection = null,
      currentScope = '',
      restored = false,
      storageOkay = true;
    const scope = () =>
      `${getMode()}-${getState()?.trip?.id || 'example'}-${getState()?.me?.id || 'guest'}`;
    const key = (id) => `omakase-outing-draft-${scope()}-${id}`;
    const root = () => dialog.querySelector('#outing-planner');
    const button = (label, action, id = '', cls = 'subtle', extra = '') =>
      `<button type="button" class="btn ${cls}" data-outing="${action}" data-stop-id="${E(id)}" ${extra}>${label}</button>`;
    const link = (url, label) =>
      safeURL(url)
        ? `<a class="text-btn" href="${E(safeURL(url))}" target="_blank" rel="noopener noreferrer">${E(label)} ${icon('external')}</a>`
        : '';
    function save() {
      if (!draft || scope() !== currentScope) return;
      try {
        sessionStorage.setItem(key(collection.id), JSON.stringify(draft));
        storageOkay = true;
      } catch {
        storageOkay = false;
      }
      const status = root()?.querySelector('[data-draft-status]');
      if (status)
        status.textContent = storageOkay
          ? 'Private draft · kept in this tab. Nothing shared yet.'
          : 'This browser cannot keep the draft. Leave this tab open until you finish.';
    }
    function read() {
      const panel = root();
      if (!panel || scope() !== currentScope) return;
      for (const field of panel.querySelectorAll('[data-draft-field]'))
        draft[field.dataset.draftField] = field.value;
      for (const row of panel.querySelectorAll('[data-outing-stop]')) {
        const stop = draft.stops.find(
          (item) => item.id === row.dataset.outingStop,
        );
        for (const input of row.querySelectorAll('[data-stop-field]'))
          stop[input.dataset.stopField] =
            input.type === 'checkbox' ? input.checked : input.value;
      }
      save();
    }
    function result() {
      return evaluate(draft, getState().trip);
    }
    function previewMarkup() {
      const value = result();
      const text = value.end
        ? `${draft.start}–${value.end} JST`
        : 'Choose a shorter day';
      return `<h3>Your day, so far.</h3><p class="outing-preview-time">${E(text)}</p><p>${value.timeline.length} ${value.timeline.length === 1 ? 'stop' : 'stops'} · ${E(duration(value.totalMinutes))}<br><span class="small muted">Includes ${value.travelMinutes} min allowed between stops.</span></p>${value.errors.length ? `<div class="notice warn" role="status">${value.errors.map(E).join('<br>')}</div>` : `<ol class="outing-preview-list">${value.timeline.map((stop) => `<li><span>${E(stop.start)}</span><span>${E(stop.label)}</span></li>`).join('')}</ol>`}<p class="small">${value.missingMeetings ? `${value.missingMeetings} meeting ${value.missingMeetings === 1 ? 'point still needs' : 'points still need'} an exact place. You can add these below or during review.` : 'Meeting points supplied. Check the entrances before sharing.'}</p>`;
    }
    function updatePreview() {
      root().querySelector('[data-outing-preview-body]').innerHTML =
        previewMarkup();
      root().querySelector('[data-outing=review]').disabled =
        result().errors.length > 0;
    }
    function stopMarkup(stop, index) {
      const place = getCatalogue().find((item) => item.id === stop.id);
      const selected = draft.stops.filter((item) => item.included);
      const selectedIndex = selected.findIndex((item) => item.id === stop.id);
      const previous =
        selectedIndex > 0
          ? getCatalogue().find(
              (item) => item.id === selected[selectedIndex - 1].id,
            )
          : null;
      const query = place.mapQuery || `${place.title} ${place.area} Japan`;
      return `<section class="outing-stop ${stop.included ? '' : 'outing-stop-skipped'}" data-outing-stop="${E(stop.id)}"><div class="outing-stop-heading"><label class="outing-include"><input type="checkbox" data-stop-field="included" ${stop.included ? 'checked' : ''} aria-label="Include ${E(place.title)}"><span><strong>${E(place.title)}</strong><small>${E(place.area)} · ${stop.included ? 'Included' : 'Leave for another day'}</small></span></label><div class="outing-reorder">${button(icon('arrow'), 'earlier', stop.id, 'icon-btn', `aria-label="Move ${E(place.title)} earlier" ${index === 0 ? 'disabled' : ''}`)}${button(icon('arrow'), 'later', stop.id, 'icon-btn', `aria-label="Move ${E(place.title)} later" ${index === draft.stops.length - 1 ? 'disabled' : ''}`)}</div></div><p>${E(collection.stops.find((item) => item.catalogueId === stop.id)?.note || place.why)}</p>${stop.included ? `<div class="outing-time-row"><div class="field"><label for="outing-minutes-${E(stop.id)}">Time here · minutes</label><input id="outing-minutes-${E(stop.id)}" type="number" min="5" max="720" step="5" value="${E(stop.minutes)}" data-stop-field="minutes" inputmode="numeric"></div>${previous ? `<div class="field"><label for="outing-gap-${E(stop.id)}">Time to get here · minutes</label><input id="outing-gap-${E(stop.id)}" type="number" min="0" max="360" step="5" value="${E(stop.gap)}" data-stop-field="gap" inputmode="numeric"></div>` : ''}</div>${previous ? `<p class="small">${link(directionURL(previous.mapQuery || `${previous.title} ${previous.area} Japan`, query), 'Check journey from previous stop')}<br>Time allowed is your estimate. Check the mode, route and conditions in Maps.</p>` : ''}<details class="outing-meeting"><summary>Meeting point & source</summary><div class="field"><label for="outing-meeting-${E(stop.id)}">Where can friends meet you?</label><input id="outing-meeting-${E(stop.id)}" maxlength="500" data-stop-field="meeting" value="${E(stop.meeting)}" placeholder="A public entrance, landmark or station exit"><small>Confirm a precise place. Do not include room numbers or access codes.</small></div><div class="row wrap">${link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, 'Find this place in Maps')}${link(place.experience?.source || place.source, 'Read the place guide')}</div><p class="small">${E(place.experience?.planning || place.practical)}</p></details>${selected.length > 1 ? button('Make this the only stop', 'only', stop.id, 'text-btn') : ''}` : ''}</section>`;
    }
    function paint(focusSelector) {
      const panel = root();
      if (!panel) return;
      panel.querySelector('[data-outing-stops]').innerHTML = draft.stops
        .map(stopMarkup)
        .join('');
      panel.querySelector('[data-outing-preview]').innerHTML =
        `<div data-outing-preview-body>${previewMarkup()}</div>${button('Review invitation ' + icon('arrow'), 'review', '', 'primary', result().errors.length ? 'disabled' : '')}<p class="small muted">Review first. Friends see it only when you publish the invitation.</p>`;
      save();
      if (focusSelector)
        panel.querySelector(focusSelector)?.focus({ preventScroll: true });
    }
    function open(id) {
      collection = getCollections().find((item) => item.id === id);
      if (!collection) {
        toast('This outing is no longer available.');
        return;
      }
      currentScope = scope();
      let saved = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(key(id)));
      } catch {
        /* A missing or malformed draft starts fresh. */
      }
      restored = saved?.version === 1 && saved.collectionId === id;
      draft = restoreDraft(saved, collection, getCatalogue(), getDay());
      const trip = getState().trip || {};
      openModal(
        'Make this a plan',
        `<div id="outing-planner"><div class="outing-editor-intro"><h2>${collection.travelScale === 'separate-stay' ? 'Make one day of it.' : 'Make it your kind of day.'}</h2><p>${E(collection.pitch)}</p><p data-draft-status class="small muted"></p>${restored ? `<p class="small">Your unfinished outing was restored. ${button('Start again', 'reset', '', 'text-btn')}</p>` : ''}</div>${collection.travelScale === 'separate-stay' ? '<div class="notice">This collection spans a separate stay. Start with one day; choose only the stops that fit that day. Flights, ferries and accommodation still need their own arrangements.</div>' : ''}<div class="field"><label for="outing-title">Name this plan</label><input id="outing-title" data-draft-field="title" maxlength="150" value="${E(draft.title)}"></div><div class="outing-when"><div class="field"><label for="outing-date">Day in Japan</label><input id="outing-date" data-draft-field="date" type="date" min="${E(trip.start || '')}" max="${E(trip.end || '')}" value="${E(draft.date)}"></div><div class="field"><label for="outing-start">Start · JST</label><input id="outing-start" data-draft-field="start" type="time" value="${E(draft.start)}"></div><div class="field"><label for="outing-finish">Finish by · optional</label><input id="outing-finish" data-draft-field="finishBy" type="time" value="${E(draft.finishBy)}"></div></div><p class="small muted">These are editable planning times, not checked opening hours.</p><div class="outing-editor-layout"><div class="outing-editor-main"><h3>Keep what feels right.</h3><p>Choose, reorder or shorten the stops. Friends can join the whole plan or just one part.</p><div data-outing-stops></div><div class="field"><label for="outing-note">A note for friends · optional</label><textarea id="outing-note" data-draft-field="notes" maxlength="500" rows="3" placeholder="The pace, the occasion, why this sounds good…">${E(draft.notes)}</textarea></div><div class="field"><label for="outing-fallback">If plans change · optional</label><textarea id="outing-fallback" data-draft-field="fallback" maxlength="300" rows="2" placeholder="For example: if it rains, just meet for dinner. Confirm any alternative separately.">${E(draft.fallback)}</textarea></div><details class="outing-sources"><summary>What still needs checking</summary><p>${E(collection.planning)}</p><p>Confirm opening, meeting points and any reservations. A travel allowance does not verify a route. Source links will travel with your invitation.</p><div class="curated-sources">${collection.sources.map((source) => link(source.url, source.label)).join('')}</div></details></div><aside class="outing-preview" aria-label="Your planned day" data-outing-preview></aside></div><div class="form-error" role="alert" data-outing-error></div></div>`,
        'outing-draft',
        id,
        true,
      );
      paint();
    }
    dialog.addEventListener('input', (event) => {
      if (!event.target.closest('#outing-planner')) return;
      read();
      updatePreview();
    });
    dialog.addEventListener('change', (event) => {
      if (!event.target.closest('#outing-planner')) return;
      read();
      if (event.target.matches('[data-stop-field=included]'))
        paint(
          `[data-outing-stop="${event.target.closest('[data-outing-stop]').dataset.outingStop}"] input[type=checkbox]`,
        );
      else updatePreview();
    });
    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-outing]');
      if (!action || !root()) return;
      event.preventDefault();
      event.stopPropagation();
      if (scope() !== currentScope) {
        toast('Your session changed. Reopen the outing.');
        return;
      }
      read();
      const id = action.dataset.stopId;
      switch (action.dataset.outing) {
        case 'earlier':
        case 'later': {
          const index = draft.stops.findIndex((stop) => stop.id === id);
          const next = index + (action.dataset.outing === 'earlier' ? -1 : 1);
          if (index < 0 || next < 0 || next >= draft.stops.length) return;
          [draft.stops[index], draft.stops[next]] = [
            draft.stops[next],
            draft.stops[index],
          ];
          paint(`[data-outing-stop="${id}"] input[type=checkbox]`);
          break;
        }
        case 'only':
          draft.stops.forEach((stop) => {
            stop.included = stop.id === id;
          });
          paint(`[data-outing-stop="${id}"] input[type=checkbox]`);
          break;
        case 'reset':
          draft = createDraft(collection, getCatalogue(), getDay());
          save();
          open(collection.id);
          break;
        case 'review':
          try {
            const invitation = toInvitation(
              draft,
              collection,
              getCatalogue(),
              getState().trip,
            );
            save();
            openPlanForm('', '', invitation);
          } catch (error) {
            root().querySelector('[data-outing-error]').textContent =
              error.message;
          }
          break;
      }
    });
    return {
      open,
      clear(id) {
        if (!id) return;
        try {
          sessionStorage.removeItem(key(id));
        } catch {
          /* Storage can be unavailable. */
        }
      },
    };
  };
})();
