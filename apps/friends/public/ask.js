'use strict';
/* Contextual companion UI. All invitations still come from the shared backend. */
window.OmakaseAsk = function ({
  getState,
  getMode,
  getDay,
  escape: E,
  openModal,
  refresh,
  showPlan,
  release,
  toast,
}) {
  const dialog = document.getElementById('dialog');
  let task = null,
    formValues = null,
    running = false,
    controller = null,
    pollTimer = null,
    selected = 0,
    draft = null;
  const id = () => crypto.randomUUID();
  const regions = {
    osaka: 'Osaka & beyond',
    tokyo: 'Tokyo',
    okinawa: 'Okinawa',
    elsewhere: 'Elsewhere',
  };
  const dateLabel = (d) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      dateStyle: 'full',
    }).format(new Date(d + 'T12:00:00+09:00'));
  const input = (name, label, value, type = 'text', extra = '') =>
    `<div class="field"><label for="ask-${name}">${label}</label><input id="ask-${name}" name="${name}" value="${E(value)}" type="${type}" ${extra}></div>`;
  async function request(path, method = 'GET', data, signal) {
    const r = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      signal: signal || AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'X-Omakase': '1',
        'X-Omakase-Release': release,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const value = await r.json();
    if (!r.ok) {
      const e = new Error(
        value.detail ||
          value.stage ||
          'Research could not finish. Nothing was published.',
      );
      e.status = r.status;
      e.task = value.id ? value : null;
      throw e;
    }
    return value;
  }
  const button = (label, action, value = '', kind = 'subtle') =>
    `<button type="button" class="btn ${kind}" data-ask="${action}" data-value="${E(value)}">${label}</button>`;
  function open(options = {}) {
    if (getMode() !== 'shared') {
      toast(
        'Ask Omakase works inside the shared trip. The example does not simulate AI.',
      );
      return;
    }
    const state = getState();
    const discovery = [...window.OMAKASE.catalogue, ...state.discoveries].find(
      (p) => p.id === options.discoveryId,
    );
    const plan = state.plans.find((p) => p.id === options.referencePlanId);
    const tomorrow = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() + 86400000));
    const date =
      plan?.date ||
      (tomorrow >= state.trip.start && tomorrow <= state.trip.end
        ? tomorrow
        : getDay());
    const travelWindow = state.me.profile.windows?.find(
      (w) => w.from <= date && w.to >= date,
    );
    formValues = {
      mode: options.mode || 'find',
      prompt:
        options.prompt ||
        (discovery
          ? `Check ${discovery.title} for my selected date.`
          : plan
            ? `Check this idea for my dates: ${plan.title}.`
            : 'I want something unusual for a couple of hours, then a good lunch. I’m going either way; friends can join whichever part they like.'),
      date,
      region:
        discovery?.region || plan?.region || travelWindow?.region || 'osaka',
      area: discovery?.area || plan?.area || travelWindow?.area || '',
      start: plan?.start || '10:00',
      end: plan?.end || '14:00',
      discoveryId: discovery?.id || plan?.catalogueId || '',
      referencePlanId: plan?.id || '',
      url: '',
    };
    form();
  }
  function form() {
    const s = getState(),
      v = formValues;
    openModal(
      'Ask Omakase',
      `<div class="eyebrow">A little help, on your terms.</div><h2>${v.mode === 'check' ? 'Worth a closer look.' : 'Find your own<br><em>little detour.</em>'}</h2><p class="lede">A few ideas for ${E(s.me.name)}. Friends choose their own days.</p><form id="ask-form"><div class="field"><label for="ask-prompt">${v.mode === 'check' ? 'What should we check?' : 'What are you in the mood for?'}</label><textarea id="ask-prompt" name="prompt" rows="4" maxlength="1200" required>${E(v.prompt)}</textarea></div><div class="field-row">${input('date', 'For this date · Japan', v.date, 'date', `min="${s.trip.start}" max="${s.trip.end}" required`)}<div class="field"><label for="ask-region">Your region</label><select id="ask-region" name="region">${Object.entries(
        regions,
      )
        .map(
          ([k, label]) =>
            `<option value="${k}" ${v.region === k ? 'selected' : ''}>${label}</option>`,
        )
        .join(
          '',
        )}</select></div></div>${input('area', 'Where would you like to start?', v.area, 'text', 'maxlength="100" placeholder="Namba, Umeda, a station or neighborhood" required')}<div class="field-row">${input('start', 'Time you choose · from JST', v.start, 'time', 'required')}${input('end', 'Until · JST', v.end, 'time', 'required')}</div><p class="small muted">These are proposed times you can edit. An empty calendar does not mean you are free. We also check your existing commitments.</p>${v.mode === 'check' ? input('url', 'A public link to check (optional)', v.url, 'url', 'placeholder="https://…" maxlength="2000"') : ''}<details class="form-detail"><summary>Your context for this request</summary><p>${E(s.me.profile.interests || 'No preferences saved yet. Describe what matters in your request.')}</p><p class="small">Uses your shared travel windows and only the parts you host or joined. It does not use friends’ preferences or old private notes.</p></details><div class="form-error" role="alert"></div><div class="form-actions"><button class="btn primary" type="submit">${v.mode === 'check' ? 'Check this idea' : 'Find something for me'}</button>${button('Recent research', 'recent')}</div><p class="small muted">Sources may be unavailable. Published hours are not proof of a booking or an open slot.</p></form>`,
      'ask',
      '',
      true,
    );
  }
  function progress() {
    openModal(
      'Ask Omakase',
      `<h2>Looking into<br><em>your kind of day.</em></h2><p>${E(dateLabel(formValues.date))} · Asia/Tokyo</p><div class="ask-progress" role="status" aria-live="polite"><span class="live-dot"></span><span id="ask-stage">Request sent. Waiting for the research service.</span></div><p class="small muted">This request has a 75-second limit. No invitation or participation is changed by research.</p>${button('Cancel research', 'cancel')}<div class="form-error" role="alert"></div>`,
      'ask',
    );
  }
  async function poll() {
    if (!running || !task) return;
    try {
      const current = await request('/ask/tasks/' + task.id);
      task = current;
      const el = document.getElementById('ask-stage');
      if (el) el.textContent = current.stage;
    } catch {
      /* The main request will report failure; no invented progress. */
    }
    if (running) pollTimer = setTimeout(poll, 1500);
  }
  async function start() {
    const requestId = id();
    task = { id: requestId };
    controller = new AbortController();
    running = true;
    progress();
    pollTimer = setTimeout(poll, 1000);
    try {
      const result = await request(
        '/ask/tasks',
        'POST',
        { ...formValues, requestId },
        AbortSignal.any([controller.signal, AbortSignal.timeout(85000)]),
      );
      task = result;
      if (!controller.signal.aborted) results();
    } catch (e) {
      if (e.task) task = e.task;
      if (!controller.signal.aborted) failure(e.message);
    } finally {
      running = false;
      clearTimeout(pollTimer);
    }
  }
  async function cancel() {
    if (!task) return;
    const current = task.id;
    controller?.abort();
    running = false;
    clearTimeout(pollTimer);
    try {
      task = await request('/ask/tasks/' + current + '/cancel', 'POST', {});
      if (dialog.open && document.getElementById('ask-stage'))
        failure(task.stage);
    } catch {
      if (dialog.open)
        failure(
          'Cancellation could not be confirmed. Reconnect and open Recent research to check its status. No invitation can publish without your confirmation.',
        );
    }
  }
  function failure(message) {
    openModal(
      'Ask Omakase',
      `<h2>A pause in the research.</h2><div class="notice warn" role="alert">${E(message)}</div><p>The ordinary fieldbook is still yours to use.</p><div class="form-actions">${button('Edit and retry', 'retry', '', 'primary')}${button('Recent research', 'recent')}</div>`,
      'ask',
    );
  }
  const sourceMarkup = (source, quotes = []) =>
    `<div class="ask-source"><a href="${E(source.url)}" target="_blank" rel="noopener noreferrer">${E(source.title)} ↗</a><small>${source.status === 'read' ? 'Page read' : 'Page unavailable'} · ${E(source.checkedAt.slice(0, 10))}${source.cached ? ' · cached' : ''}</small>${quotes.map((q) => `<blockquote>${E(q)}</blockquote>`).join('')}</div>`;
  function results() {
    if (!['complete', 'published'].includes(task.status)) {
      failure(task.stage || 'Research is not ready yet.');
      return;
    }
    const r = task.result,
      u = r.usage;
    openModal(
      'Ask Omakase',
      `<div class="eyebrow">For your day, not everyone’s.</div><h2>A few ways<br><em>to spend it.</em></h2><p class="lede">${E(dateLabel(r.date))} · Asia/Tokyo</p>${r.question ? `<div class="notice">${E(r.question)}</div>${button('Add that detail', 'retry')}` : ''}<div class="ask-options">${r.options
        .map(
          (o, i) =>
            `<article class="ask-option"><span class="eyebrow">${String(i + 1).padStart(2, '0')} / ${E(o.effort)}</span><h3>${E(o.title)}</h3><p>${E(o.reason)}</p><div class="ask-parts">${o.draft.segments.map((s) => `<div><strong>${E(s.start)}–${E(s.end)}</strong><span>${E(s.label)}</span><small>${E(s.meeting)}</small></div>`).join('')}</div><p class="ask-caveat"><strong>Before you go.</strong> ${E(o.uncertainty)}</p><details><summary>Sources & what remains uncertain</summary>${r.sources
              .filter(
                (s) =>
                  s.discoveryId === o.discoveryId ||
                  o.draft.segments.some(
                    (part) => part.discoveryId === s.discoveryId,
                  ) ||
                  o.citations.some((c) => c.sourceId === s.id),
              )
              .map((s) =>
                sourceMarkup(
                  s,
                  o.citations
                    .filter((c) => c.sourceId === s.id)
                    .map((c) => c.quote),
                ),
              )
              .join(
                '',
              )}<p class="small">Quotes are published page information. Proposed timings, costs and meeting points are estimates. Nothing is booked.</p></details><div class="form-actions">${button('Make an invitation', 'draft', i, 'primary')}${r.places.find((p) => p.id === o.discoveryId)?.external ? button('Keep this discovery', 'save', o.discoveryId) : ''}</div></article>`,
        )
        .join(
          '',
        )}</div><p class="small muted">${E(r.contextNotice)}</p><details class="ask-usage"><summary>Research usage</summary><p>${E(u.model)} · ${u.providerCalls} model calls · ${u.sourceCalls} sources (${u.cacheHits} cached) · ${(u.elapsedMs / 1000).toFixed(1)} seconds.</p><p>${u.measured ? `${u.inputTokens} input / ${u.outputTokens} output tokens · ${u.neurons.toFixed(1)} neurons · estimated $${u.estimatedUSD.toFixed(4)} USD at published model rates.` : 'The provider did not return complete usage. The task budget remains conservatively reserved.'} This estimate is not an invoice.</p></details><div class="form-actions">${button('Refine this request', 'retry')}${button('Recent research', 'recent')}</div><div class="form-error" role="alert"></div>`,
      'ask',
      '',
      true,
    );
  }
  function preview(index) {
    selected = Number(index);
    draft = structuredClone(task.result.options[selected].draft);
    openModal(
      'Review your invitation',
      `<div class="eyebrow">A draft, until you say so.</div><h2>I’m going.<br><em>Come for your part?</em></h2><p>${E(dateLabel(draft.date))} · ${E(regions[draft.region])} · Asia/Tokyo</p><div class="notice">Publishing opens an invitation in the shared trip. Nobody is assigned, joined or sent a personal invitation. Friends choose any part. Tickets are separate.</div><form id="ask-confirm-form">${input('title', 'Invitation title', draft.title, 'text', 'maxlength="150" required')}<div class="field"><label for="ask-kind">How decided are you?</label><select id="ask-kind" name="kind"><option value="going" ${draft.kind === 'going' ? 'selected' : ''}>I’m going · company welcome</option><option value="idea" ${draft.kind === 'idea' ? 'selected' : ''}>An idea · not a commitment</option></select></div>${input('area', 'Area', draft.area, 'text', 'maxlength="100" required')}<div class="field-row">${input('start', 'Outing starts · JST', draft.start, 'time', 'required')}${input('end', 'Outing ends · JST', draft.end, 'time', 'required')}</div><div class="field"><label for="ask-description">In your words</label><textarea id="ask-description" name="description" rows="3" maxlength="2400">${E(draft.description)}</textarea></div><div class="ask-edit-parts">${draft.segments.map((s, i) => `<section class="segment-edit" data-ask-part="${i}"><span class="eyebrow">Separately joinable part ${i + 1}</span>${input('label-' + i, 'What can friends join?', s.label, 'text', 'maxlength="100" required')}<div class="field-row">${input('start-' + i, 'From · JST', s.start, 'time', 'required')}${input('end-' + i, 'Until · JST', s.end, 'time', 'required')}</div>${input('meeting-' + i, 'Meeting point for this part', s.meeting, 'text', 'maxlength="500" required')}</section>`).join('')}</div><p class="small muted">Times, meeting points and costs are planning estimates. Edit them before publishing and confirm details with the venue. If the trip changes, this draft must be checked again.</p><div class="form-error" role="alert"></div><div class="form-actions"><button type="submit" class="btn primary">Confirm & publish invitation</button>${button('Back to options', 'results')}</div></form>`,
      'ask',
      '',
      true,
    );
  }
  async function confirm(form) {
    const data = Object.fromEntries(new FormData(form));
    const edited = {
      ...draft,
      title: data.title,
      kind: data.kind,
      area: data.area,
      start: data.start,
      end: data.end,
      description: data.description,
      segments: draft.segments.map((s, i) => ({
        ...s,
        label: data['label-' + i],
        start: data['start-' + i],
        end: data['end-' + i],
        meeting: data['meeting-' + i],
      })),
    };
    edited.meeting = edited.segments[0].meeting;
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      const r = await request('/ask/tasks/' + task.id + '/confirm', 'POST', {
        option: selected,
        draft: edited,
      });
      await refresh(false);
      showPlan(r.plan.id);
      toast('Invitation published. Friends choose whether to join.');
    } catch (e) {
      form.querySelector('.form-error').textContent = e.message;
      if (e.status === 409)
        form
          .querySelector('.form-error')
          .insertAdjacentHTML('beforeend', `<p>${buttonMarkupRefresh()}</p>`);
    } finally {
      button.disabled = false;
    }
  }
  const buttonMarkupRefresh = () =>
    button('Refresh research with these constraints', 'retry');
  async function recent() {
    const r = await request('/ask/tasks');
    openModal(
      'Your recent research',
      `<h2>Pick up a thread.</h2><p>Only this member’s research. These cards are not an itinerary.</p>${r.tasks.map((t) => `<article class="ask-option"><strong>${E(t.input.prompt || 'Cancelled request')}</strong><p>${E(t.stage)}</p><small>${E(t.created.slice(0, 16))} UTC</small>${button('Open research', 'load', t.id)}</article>`).join('') || '<p>No research yet.</p>'}`,
      'ask',
      '',
      true,
    );
  }
  document.addEventListener(
    'submit',
    async (event) => {
      const form = event.target;
      if (!['ask-form', 'ask-confirm-form'].includes(form.id)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!navigator.onLine) {
        form.querySelector('.form-error').textContent =
          'You are offline. Nothing was sent. Keep this draft and reconnect.';
        return;
      }
      if (form.id === 'ask-form') {
        formValues = {
          ...formValues,
          ...Object.fromEntries(new FormData(form)),
        };
        await start();
      } else await confirm(form);
    },
    true,
  );
  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-ask]');
    if (!target) return;
    event.preventDefault();
    try {
      switch (target.dataset.ask) {
        case 'cancel':
          await cancel();
          break;
        case 'retry':
          form();
          break;
        case 'results':
          results();
          break;
        case 'draft':
          preview(target.dataset.value);
          break;
        case 'recent':
          await recent();
          break;
        case 'load':
          task = await request('/ask/tasks/' + target.dataset.value);
          formValues = task.input;
          results();
          break;
        case 'save': {
          const saved = await request(
            '/ask/tasks/' + task.id + '/save',
            'POST',
            { discoveryId: target.dataset.value },
          );
          await refresh(false);
          target.textContent = 'Saved in Discover';
          target.disabled = true;
          toast(
            saved.id
              ? 'Discovery saved with its source.'
              : 'No discovery was saved.',
          );
          break;
        }
      }
    } catch (e) {
      const error = dialog.querySelector('.form-error');
      if (error) error.textContent = e.message;
      else toast(e.message, true);
    }
  });
  dialog.addEventListener('close', () => {
    if (running) void cancel();
  });
  return { open };
};
