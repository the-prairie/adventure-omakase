'use strict';
/* Real service tools. Rendering never fabricates a provider result. */
window.OmakaseTravel = function ({
  getState,
  getMode,
  escape: E,
  openModal,
  openAsk,
  openMemory,
  release,
  toast,
}) {
  const dialog = document.getElementById('dialog');
  let generation = 0,
    active = null,
    result = null,
    media = '',
    mediaPending = false,
    recorder = null,
    recordTimer = null,
    stream = null;
  const button = (label, action, value = '', kind = 'subtle') =>
    `<button type="button" class="btn ${kind}" data-travel="${action}" data-value="${E(value)}">${label}</button>`;
  const field = (name, label, value = '', extra = '') =>
    `<div class="field"><label for="travel-${name}">${label}</label><input id="travel-${name}" name="${name}" value="${E(value)}" ${extra}></div>`;
  const errorMarkup = '<div class="form-error" role="alert"></div>';
  const external = (url, label) =>
    `<a class="btn subtle" href="${E(url)}" target="_blank" rel="noopener noreferrer">${E(label)} ↗</a>`;
  async function api(path, method = 'GET', data, signal) {
    const r = await fetch('/api/travel' + path, {
      method,
      credentials: 'same-origin',
      signal: signal || AbortSignal.timeout(20000),
      headers: {
        'Content-Type': 'application/json',
        'X-Omakase': '1',
        'X-Omakase-Release': release,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const d = await r.json();
    if (!r.ok)
      throw Error(
        d.detail || 'The service could not finish. Nothing was saved.',
      );
    return d;
  }
  function stopRecording() {
    clearTimeout(recordTimer);
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  function show(title, html) {
    generation++;
    openModal(title, `<div class="travel-tool">${html}</div>`, 'travel');
  }
  function open(kind = 'translate', values = {}) {
    if (getMode() !== 'shared') {
      toast(
        'Travel tools use the shared app and real services. The example does not simulate them.',
      );
      return;
    }
    stopRecording();
    media = '';
    result = null;
    const state = getState(),
      area = state.me.profile?.windows?.[0]?.area || 'Namba, Osaka';
    if (kind === 'watches') {
      void watches();
      return;
    }
    const heading = {
      translate: 'A little help<br><em>with the words.</em>',
      memory: 'Tell it<br><em>in your own words.</em>',
      places: 'A little closer<br><em>to where you are.</em>',
      route: 'From here<br><em>to there.</em>',
      search: 'Follow<br><em>your curiosity.</em>',
      watch: 'Keep an eye<br><em>on one page.</em>',
    }[kind];
    let fields = '';
    if (['translate', 'memory'].includes(kind))
      fields = `<div class="field"><label for="travel-text">${kind === 'memory' ? 'Your note, or record it below' : 'Japanese or English text'}</label><textarea id="travel-text" name="text" rows="5" maxlength="6000" placeholder="${kind === 'memory' ? 'The thing I want to remember…' : 'Paste the words you want to understand…'}">${E(values.text || '')}</textarea></div>${kind === 'translate' ? '<div class="field"><label for="travel-target">Translate into</label><select id="travel-target" name="target"><option>English</option><option>Japanese</option></select></div>' : ''}<div class="field"><label for="travel-media">${kind === 'memory' ? 'Or choose a short recording' : 'Or choose a photograph or short recording'}</label><input id="travel-media" type="file" accept="${kind === 'memory' ? 'audio/*' : 'image/jpeg,image/png,image/webp,audio/*'}"><small>Selected content is sent to Gemini only when you press the button below. Media is not retained by this app unless you separately add a photo to a memory.</small></div><div class="row wrap">${button('Record up to 30 seconds', 'record')}${button('Stop recording', 'stop-record')}</div><p id="travel-media-status" class="small" role="status">No media selected.</p><p class="small muted">${kind === 'memory' ? 'You review the transcription and draft before sharing. Nothing is added to the book automatically.' : 'Original words remain visible beside the translation. Unclear text may need another photograph; a translation cannot establish ingredients or safety.'}</p>`;
    if (['places', 'search'].includes(kind))
      fields =
        field(
          'query',
          kind === 'places' ? 'What and where?' : 'A venue question and area',
          values.query || (kind === 'places' ? 'Lunch near ' + area : ''),
          'maxlength="500" required',
        ) +
        `<p class="small muted">${kind === 'places' ? 'Live Google Maps place information. Hours are published information, not a reservation.' : 'Find up to three venue websites and read their public text. Keep personal trip details out of this search.'}</p>`;
    if (kind === 'route')
      fields =
        field(
          'origin',
          'From',
          values.origin || area,
          'maxlength="300" required',
        ) +
        field(
          'destination',
          'To',
          values.destination || '',
          'maxlength="300" required',
        ) +
        '<div class="field"><label for="travel-mode">Travel by</label><select id="travel-mode" name="mode"><option value="WALK">Walking</option><option value="TRANSIT">Transit · leaving now</option></select></div><p class="small muted">This obtains a route estimate; it does not track your location. Transit is checked for departure now.</p>';
    if (kind === 'watch')
      fields =
        field(
          'title',
          'What are you watching?',
          values.title || '',
          'maxlength="120" required',
        ) +
        field(
          'url',
          'Public venue page',
          values.url || '',
          'type="url" required maxlength="2000"',
        ) +
        field(
          'phrase',
          'Optional phrase to watch around',
          '',
          'maxlength="120" placeholder="Tickets, 休業, reservations…"',
        ) +
        '<div class="field"><label for="travel-hours">Stop after</label><select id="travel-hours" name="hours"><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="336">14 days</option></select></div><div class="notice">Checks run approximately hourly. You will see an in-app update only when the readable page changes or repeated checks fail. This watches published text; it cannot verify ticket inventory or bookings. Login-only and script-only pages may not work.</div><label class="travel-consent"><input name="confirm" type="checkbox" required> Schedule this watch until its deadline.</label>';
    show(
      'Travel companion',
      `<div class="eyebrow">A useful little companion</div><h2>${heading || ''}</h2><form id="travel-form" data-kind="${E(kind)}">${fields}${errorMarkup}<div class="form-actions"><button class="btn primary" type="submit">${{ translate: 'Interpret this', memory: 'Draft my memory', places: 'Find nearby places', route: 'Get route estimate', search: 'Search public sources', watch: 'Confirm & start watch' }[kind]}</button>${button('Recent drafts', 'history')}${button('My checks', 'watches')}</div></form>`,
    );
  }
  function progress(kind) {
    show(
      'Travel companion',
      `<h2>${kind === 'memory' ? 'Listening to your words.' : 'Checking the details.'}</h2><p role="status">Waiting for the live service. Nothing is saved or published automatically.</p>${button('Cancel this request', 'cancel')}${errorMarkup}`,
    );
  }
  async function submit(form) {
    if (mediaPending || recorder?.state === 'recording') {
      form.querySelector('.form-error').textContent =
        'Stop the recording and wait until the media is ready before submitting.';
      return;
    }
    const data = Object.fromEntries(new FormData(form)),
      kind = form.dataset.kind;
    data.kind = kind;
    if (kind === 'watch') {
      data.confirm = data.confirm === 'on';
      data.hours = Number(data.hours);
      const gen = generation;
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        await api('/watches', 'POST', data);
        if (gen === generation) await watches();
      } catch (e) {
        if (gen === generation) {
          form.querySelector('.form-error').textContent = e.message;
          submit.disabled = false;
        }
      }
      return;
    }
    if (media) data.media = media;
    const requestId = crypto.randomUUID(),
      controller = new AbortController();
    active = { requestId, controller };
    progress(kind);
    const gen = generation;
    try {
      const d = await api(
        '/tasks',
        'POST',
        { ...data, requestId },
        AbortSignal.any([controller.signal, AbortSignal.timeout(70000)]),
      );
      if (gen !== generation || controller.signal.aborted) return;
      if (d.status === 'cancelled') {
        toast('The request was cancelled.');
        return;
      }
      result = d.result;
      renderResult();
    } catch (e) {
      if (gen === generation && !controller.signal.aborted)
        show(
          'Travel companion',
          `<h2>A pause<br><em>in the help.</em></h2><div class="notice warn" role="alert">${E(e.message)}</div>${button('Try again', 'open', kind)}`,
        );
    } finally {
      if (active?.requestId === requestId) active = null;
    }
  }
  function renderResult() {
    const r = result;
    if (r.ephemeral) {
      show(
        'Travel companion',
        `<p>${E(r.notice)}</p>${button('Run a fresh check', 'open', r.kind)}`,
      );
      return;
    }
    let html = '';
    if (['translate', 'memory'].includes(r.kind))
      html = `<div class="eyebrow">${r.kind === 'memory' ? 'A draft for you to review' : 'Machine translation · keep the original'}</div><h2>${r.kind === 'memory' ? 'Your words.<br><em>Your memory.</em>' : 'A little clearer.'}</h2><div class="translation-pair"><section><h3>Original / transcription</h3><p class="preserve-text" lang="ja">${E(r.original)}</p></section><section><h3>${r.kind === 'memory' ? 'Editable draft next' : 'Translation'}</h3><p class="preserve-text">${E(r.translated)}</p>${r.romanization && r.kind !== 'memory' ? `<p>${E(r.romanization)}</p>` : ''}</section></div>${r.notes ? `<div class="notice">${E(r.notes)}</div>` : ''}<p class="small muted">${E(r.checkedAt)} · ${E(r.usage.model)} · estimated model usage $${E(r.usage.estimatedUSD.toFixed(4))} USD.</p><div class="form-actions">${button(r.kind === 'memory' ? 'Review & save a memory' : 'Use in a memory', 'memory-draft', '', 'primary')}${button('Translate something else', 'open', 'translate')}</div>`;
    if (r.kind === 'places')
      html = `<div class="eyebrow">Google Maps · live lookup</div><h2>Some places<br><em>near your idea.</em></h2><p class="small">${E(r.notice)}</p>${!r.places.length ? '<p>No matching places were returned. Try another area.</p>' : ''}${r.places.map((p, i) => `<article class="ask-option"><h3>${E(p.name)}</h3><p>${E(p.address)}</p><p class="small">${E(p.businessStatus.replaceAll('_', ' '))}</p><details><summary>Published hours</summary>${p.hours.map((h) => `<p class="small">${E(h)}</p>`).join('') || '<p>Hours were not supplied.</p>'}</details><div class="form-actions">${external(p.url, 'Open in Google Maps')}${button('Directions', 'place-route', i)}${p.website ? button('Check the venue website', 'place-check', i) : ''}</div>${p.attributions.map((a) => `<p class="small">${a.uri ? external(a.uri, a.name) : E(a.name)}</p>`).join('')}</article>`).join('')}<p class="small muted">Google Maps · checked ${E(r.checkedAt)}. Results are not added to the shared book.</p>`;
    if (r.kind === 'route')
      html = `<div class="eyebrow">Google Maps · route estimate</div><h2>${E(String(r.minutes))} minutes<br><em>from here.</em></h2><p>${E(r.origin)} → ${E(r.destination)}</p><p>${E((r.distanceMeters / 1000).toFixed(1))} km · ${r.mode === 'WALK' ? 'Walking' : 'Transit'}</p><div class="notice">${E(r.notice)}</div><p class="small">Checked ${E(r.checkedAt)}.</p>${external(r.url, 'Open route in Google Maps')}${button('Another route', 'open', 'route')}`;
    if (r.kind === 'search')
      html = `<div class="eyebrow">Public venue websites · research</div><h2>A few things<br><em>to follow.</em></h2><p class="preserve-text">${E(r.answer)}</p><div class="ask-source">${r.sources.map((s, i) => `<p>${external(s.url, s.title || 'Source ' + (i + 1))}</p>`).join('')}</div><p class="small">Checked ${E(r.checkedAt)}. This answer and its source links are shown together; it is not saved to the shared book.</p><div class="form-actions">${button('Check a source for my dates', 'search-check', '0', 'primary')}${button('Search again', 'open', 'search')}</div>`;
    if (['places', 'route'].includes(r.kind))
      html +=
        '<img class="maps-attribution" src="/google-maps.svg" alt="Google Maps" translate="no">';
    show('Travel companion', html);
  }
  let recent = [];
  async function history() {
    const gen = ++generation;
    const d = await api('/tasks');
    if (gen !== generation) return;
    recent = d.tasks;
    show(
      'Your recent drafts',
      '<h2>Pick up<br><em>your words.</em></h2><p>Private helper results are kept for seven days. Places and route results need a fresh lookup.</p>' +
        recent
          .map(
            (t, i) =>
              `<article class="ask-option"><h3>${E(t.kind)} · ${E(t.status)}</h3><p class="small">${E(t.created)}</p>${t.status === 'complete' ? button('Open result', 'history-open', i) : ''}</article>`,
          )
          .join('') +
        button('Refresh', 'history'),
    );
  }
  async function watches() {
    const gen = ++generation;
    stopRecording();
    try {
      const d = await api('/watches');
      if (gen !== generation) return;
      show(
        'Your website watches',
        `<div class="eyebrow">Only what you asked to watch</div><h2>A quiet eye<br><em>on the details.</em></h2>${button('Watch a public page', 'open', 'watch', 'primary')}<p class="small muted">Approximately hourly checks, in-app updates only. Nothing is emailed or sent to friends.</p>${d.events
          .filter((e) => !e.seen)
          .map(
            (e) =>
              `<article class="ask-option"><span class="eyebrow">An update · ${E(e.created)}</span><p>${E(e.summary)}</p>${e.before_text ? `<details><summary>What changed</summary><h4>Before</h4><p class="preserve-text">${E(e.before_text)}</p><h4>After</h4><p class="preserve-text">${E(e.after_text)}</p></details>` : ''}${button('Mark read', 'watch-seen', e.watch_id)}</article>`,
          )
          .join(
            '',
          )}${d.watches.map((w) => `<article class="ask-option"><h3>${E(w.title)}</h3><p class="small">${E(w.status)} · stops ${E(w.expires)}</p><p class="small">${w.last_checked ? 'Last checked ' + E(w.last_checked) : 'First check pending'}${w.status === 'active' ? ' · next due ' + E(w.next_check) : ''}</p>${external(w.url, 'Open watched page')}<div class="form-actions">${w.status === 'active' ? button('Check now', 'watch-check', w.id) + button('Cancel watch', 'watch-cancel', w.id) : ''}</div></article>`).join('') || '<p>No watches yet.</p>'}<div class="form-error" role="alert"></div>`,
      );
    } catch (e) {
      if (gen === generation) toast(e.message);
    }
  }
  async function prepareFile(file) {
    if (!file) return;
    const gen = generation;
    mediaPending = true;
    try {
      media = '';
      if (file.type.startsWith('image/')) {
        if (file.size > 12000000)
          throw Error('Choose a photograph under 12 MB.');
        const bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
          }),
          scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
          canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
          .getContext('2d')
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        if (gen !== generation) return;
        media = canvas.toDataURL('image/jpeg', 0.78);
      } else {
        if (file.size > 1500000)
          throw Error('Choose a recording under 1.5 MB.');
        const value = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (gen !== generation) return;
        media = value;
      }
      if (media.length > 2100000) {
        media = '';
        throw Error(
          'The resized file is still too large. Choose a smaller one.',
        );
      }
      const label = dialog.querySelector('#travel-media-status');
      if (label)
        label.textContent =
          'Media ready. It will be sent only when you submit.';
    } finally {
      mediaPending = false;
    }
  }
  async function record() {
    if (recorder?.state === 'recording') return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw Error(
        'This browser cannot record audio. Choose a recording or type instead.',
      );
    const gen = generation;
    const input = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (gen !== generation) {
      input.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = input;
    const mime = [
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ].find((t) => MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      if (gen === generation)
        void prepareFile(
          new File(chunks, 'recording', { type: recorder.mimeType }),
        ).catch((e) => toast(e.message));
    };
    recorder.start();
    dialog.querySelector('#travel-media-status').textContent =
      'Recording locally. Stops after 30 seconds; then review before submitting.';
    recordTimer = setTimeout(stopRecording, 30000);
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'travel-form') {
      e.preventDefault();
      void submit(e.target);
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'travel-media')
      void prepareFile(e.target.files[0]).catch((err) => toast(err.message));
  });
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-travel]');
    if (!target) return;
    const action = target.dataset.travel,
      value = target.dataset.value || '';
    try {
      if (action === 'open') open(value || 'translate');
      else if (action === 'watches') await watches();
      else if (action === 'history') await history();
      else if (action === 'history-open') {
        result = recent[Number(value)].result;
        renderResult();
      } else if (action === 'record') await record();
      else if (action === 'stop-record') stopRecording();
      else if (action === 'cancel' && active) {
        const a = active;
        generation++;
        a.controller.abort();
        await api('/tasks/' + a.requestId + '/cancel', 'POST', {});
        show(
          'Travel companion',
          '<h2>Request cancelled.</h2><p>Nothing was saved or published.</p>' +
            button('Travel tools', 'open', 'translate'),
        );
      } else if (action === 'memory-draft' && result) {
        const r = result;
        openMemory({
          text: r.translated,
          title: r.kind === 'memory' ? r.romanization : '',
        });
      } else if (action === 'place-route') {
        const p = result.places[Number(value)];
        open('route', { destination: p.name + ', ' + p.address });
      } else if (action === 'place-check') {
        const p = result.places[Number(value)];
        openAsk({
          mode: 'check',
          url: p.website,
          prompt: 'Check this venue for my selected date: ' + p.name,
        });
      } else if (action === 'search-check') {
        const s = result.sources[Number(value)];
        openAsk({
          mode: 'check',
          url: s.url,
          prompt: 'Check this public source for my selected dates.',
        });
      } else if (action === 'route-to') open('route', { destination: value });
      else if (action === 'translate-text') open('translate', { text: value });
      else if (action === 'watch-url') open('watch', { url: value });
      else if (action.startsWith('watch-')) {
        await api('/watches/' + value + '/' + action.slice(6), 'POST', {});
        await watches();
      }
    } catch (err) {
      const box = dialog.querySelector('.form-error');
      if (box) box.textContent = err.message;
      else toast(err.message);
    }
  });
  dialog.addEventListener('close', () => {
    generation++;
    stopRecording();
  });
  // Check for our own unseen watch events while the app is visible, never a background-work simulation.
  let watchPoll = null;
  async function poll() {
    clearTimeout(watchPoll);
    if (getMode() === 'shared' && !document.hidden && navigator.onLine) {
      try {
        const d = await api('/watches');
        const count = d.events.filter((e) => !e.seen).length;
        document.querySelectorAll('[data-travel="watches"]').forEach((el) => {
          el.textContent = count
            ? 'My checks · ' + count + ' new'
            : 'My checks';
        });
      } catch {
        /* The watch panel reports connectivity failures when opened. */
      }
    }
    watchPoll = setTimeout(poll, 60000);
  }
  watchPoll = setTimeout(poll, 5000);
  return { open };
};
