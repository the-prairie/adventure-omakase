'use strict';
(() => {
  const CLIENT_RELEASE = 'development';
  let C = [...window.OMAKASE.catalogue];
  const A = window.OMAKASE.assets,
    BY = new Map(C.map((x) => [x.id, x]));
  const R = {
    tokyo: 'Tokyo',
    osaka: 'Osaka & beyond',
    okinawa: 'Okinawa',
    elsewhere: 'Elsewhere',
  };
  let DAYS = Array.from({ length: 19 }, (_, i) =>
    new Date(Date.UTC(2026, 8, 26 + i)).toISOString().slice(0, 10),
  );
  const E = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const norm = (s) =>
    String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const todayJP = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const dateText = (d, opts = { month: 'short', day: 'numeric' }) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        ...opts,
        timeZone: 'Asia/Tokyo',
      }).format(new Date(d + 'T12:00:00+09:00'));
    } catch {
      return 'Date unavailable';
    }
  };
  const when = (s) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tokyo',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(s));
    } catch {
      return '';
    }
  };
  const safeURL = (s) => {
    try {
      const u = new URL(s);
      return ['http:', 'https:'].includes(u.protocol) &&
        !u.username &&
        !u.password
        ? u.href
        : '';
    } catch {
      return '';
    }
  };
  const mapSearch = (p) =>
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(
      [p.meeting, p.area, R[p.region], 'Japan'].filter(Boolean).join(' '),
    );
  const iconPaths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    external: '<path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    people:
      '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
    book: '<path d="M12 5c-4-3-8-2-9-1v15c4-2 7-1 9 1 2-2 5-3 9-1V4c-1-1-5-2-9 1ZM12 5v15"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v5M16 3v5M7 14h2m3 0h2M7 17h2m3 0h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
    route:
      '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9c7 0 7 7 0 7H8c-7 0-7 7 0 7h9"/>',
    camera:
      '<path d="M3 7h4l2-3h6l2 3h4v14H3Z"/><circle cx="12" cy="13" r="4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r=".8"/><circle cx="16" cy="8" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="8" cy="16" r=".8"/><circle cx="16" cy="16" r=".8"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    message: '<path d="M21 4H3v13h5v4l5-4h8ZM7 8h10M7 12h6"/>',
    wave: '<path d="M2 9c3-5 5 5 8 0s5 5 8 0 4 0 4 0M2 15c3-5 5 5 8 0s5 5 8 0 4 0 4 0"/>',
    leaf: '<path d="M20 3c-3 0-15 1-15 10a7 7 0 0 0 11 6c5-4 4-11 4-16ZM3 22l13-13"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
    food: '<path d="M4 3v7c0 3 5 3 5 0V3M6.5 3v18M17 3c-4 5-4 10 1 10V3v18"/>',
    building:
      '<path d="m3 8 9-5 9 5H3ZM5 9v10M10 9v10M14 9v10M19 9v10M2 21h20"/>',
    coffee:
      '<path d="M3 8h13v5a6.5 6.5 0 0 1-13 0ZM16 9h2a3 3 0 0 1 0 6h-2M2 21h16M6 3v2M11 3v2"/>',
    star: '<path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  };
  const I = (n) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[n] || iconPaths.star}</svg>`;
  const MOODS = {
    Strange: 'star',
    Food: 'food',
    Water: 'wave',
    Architecture: 'building',
    Slow: 'coffee',
    Move: 'route',
    Make: 'edit',
    Culture: 'book',
  };
  let mode =
    location.protocol === 'file:' ||
    ['/example.html', '/example'].includes(location.pathname)
      ? 'demo'
      : 'shared';
  let setupRequired = false,
    setupKey = new URLSearchParams(location.hash.slice(1)).get('setup') || '',
    deviceKey = new URLSearchParams(location.hash.slice(1)).get('device') || '',
    pendingPlan = new URLSearchParams(location.hash.slice(1)).get('plan') || '';
  let S = null,
    online = true,
    stream = null,
    ui = {
      view: 'plans',
      region: 'all',
      day:
        mode === 'demo'
          ? '2026-10-04'
          : DAYS.includes(todayJP())
            ? todayJP()
            : DAYS[0],
      boardDay: 'all',
      mine: false,
      q: '',
      mood: 'all',
      area: 'all',
      max: 'all',
      saved: false,
      limit: 24,
      story: 'group',
    };
  let modal = null,
    lastFocus = null,
    busy = false,
    timer = null,
    joinToken =
      new URLSearchParams(location.hash.replace(/^#/, '')).get('join') || '',
    draftPhotos = [],
    draftSegments = [],
    windowsDraft = [],
    photoBusy = false,
    diceSeen = new Set(),
    confirmation = null;
  const app = document.getElementById('app'),
    dialog = document.getElementById('dialog');
  const person = (id) =>
    S?.members.find((m) => m.id === id) || {
      id,
      name: 'Former traveler',
      active: false,
    };
  const avatar = (id, cls = '') => {
    const m = person(id),
      n = Math.max(0, S?.members.findIndex((x) => x.id === id) || 0);
    return `<span class="avatar a${n % 5} ${cls}" title="${E(m.name)}" aria-label="${E(m.name)}">${E(
      m.name
        .split(/\s+/)
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    )}</span>`;
  };
  const myR = (p) => p.rsvps.find((r) => r.memberId === S.me.id);
  const joined = (p) =>
    p.rsvps.filter((r) => r.status === 'joined' && person(r.memberId).active);
  const myPlan = (p) => p.hostId === S.me.id || myR(p)?.status === 'joined';
  const segment = (p, r) => p.segments.find((s) => s.id === r?.choice);
  const formatTime = (p) => `${E(p.start)}–${E(p.end)}`;
  const photo = (id) =>
    mode === 'demo'
      ? OmakaseDemo.photo(id)
      : '/api/photos/' + encodeURIComponent(id);
  const saved = (id) =>
    S.picks.find((p) => p.catalogueId === id && p.memberId === S.me.id);
  const countUpdates = () =>
    S.changes.filter((c) => c.seq > S.readSeq && c.actor !== S.me.id).length;
  const btn = (label, action, id = '', cls = '') =>
    `<button type="button" class="btn ${cls}" data-action="${action}" ${id ? `data-id="${E(id)}"` : ''}>${label}</button>`;
  function toast(message, error = false) {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.className = 'visible' + (error ? ' error' : '');
    clearTimeout(timer);
    timer = setTimeout(() => (t.className = ''), error ? 6500 : 3400);
  }
  function errText(e) {
    return typeof e.detail === 'object'
      ? e.detail.message
      : e.message || 'That did not work. Please try again.';
  }
  async function api(path, method = 'GET', d = {}) {
    if (mode === 'demo') return await OmakaseDemo.call(path, method, d);
    if (!online && method !== 'GET')
      throw Error(
        'You are offline. This has not been sent. Keep your draft and reconnect; joining is never confirmed offline.',
      );
    let r;
    try {
      r = await fetch('/api' + path, {
        method,
        credentials: 'same-origin',
        signal: AbortSignal.timeout(15000),
        headers:
          method === 'GET'
            ? {}
            : {
                'Content-Type': 'application/json',
                'X-Omakase': '1',
                'X-Omakase-Release': CLIENT_RELEASE,
              },
        body: method === 'GET' ? undefined : JSON.stringify(d),
      });
    } catch {
      online = false;
      throw Error(
        method === 'GET'
          ? 'Cannot reach the shared trip.'
          : 'Connection interrupted. Your change may have reached the server. Reconnect and refresh before trying again.',
      );
    }
    const value = await r
      .json()
      .catch(() => ({ detail: 'The server returned an unreadable response.' }));
    if (!r.ok) {
      const e = new Error(
        typeof value.detail === 'object'
          ? value.detail.message
          : value.detail || 'Request failed.',
      );
      e.status = r.status;
      e.detail = value.detail;
      throw e;
    }
    online = true;
    return value;
  }
  function acceptState(next, renderPage = true) {
    const previous = S;
    S = next;
    if (S.trip?.start && S.trip?.end) {
      const count = Math.min(
        366,
        Math.floor(
          (Date.parse(S.trip.end) - Date.parse(S.trip.start)) / 86400000,
        ) + 1,
      );
      DAYS = Array.from({ length: count }, (_, i) =>
        new Date(Date.parse(S.trip.start) + i * 86400000)
          .toISOString()
          .slice(0, 10),
      );
      if (!DAYS.includes(ui.day)) ui.day = S.trip.start;
    }
    C = [
      ...window.OMAKASE.catalogue,
      ...(S.discoveries || []).map((d, i) => ({
        ...d,
        n: 301 + i,
        mood:
          {
            food: 'Food',
            culture: 'Culture',
            nature: 'Move',
            water: 'Water',
            design: 'Architecture',
            odd: 'Strange',
            craft: 'Make',
          }[d.category] || 'Culture',
        flags: '',
        indoor: false,
        featured: false,
        cluster: d.area,
        practical:
          'A friend’s find. Check opening, access and any reservations before going.',
        mapQuery: [d.title, d.area, R[d.region], 'Japan'].join(' '),
      })),
    ];
    BY.clear();
    C.forEach((d) => BY.set(d.id, d));
    try {
      if (mode === 'shared')
        sessionStorage.setItem('omakase-last-view', JSON.stringify(S));
    } catch {
      /* Best-effort fallback; canonical server state is unchanged. */
    }
    if (modal?.type === 'plan' && previous) {
      const p = S.plans.find((p) => p.id === modal.id);
      if (
        p &&
        p.revision !== modal.revision &&
        !dialog.querySelector('.updated-notice')
      )
        dialog
          .querySelector('.dialog-body')
          .insertAdjacentHTML(
            'afterbegin',
            `<div class="updated-notice">The host changed this invitation. Check the latest meeting details. <button class="text-btn" data-action="plan-detail" data-id="${E(p.id)}">Refresh this plan ${I('arrow')}</button></div>`,
          );
    }
    if (renderPage) render();
  }
  async function refresh(renderPage = true) {
    try {
      const next = await api('/state');
      acceptState(next, renderPage);
    } catch (e) {
      if (e.status === 401) {
        S = null;
        stream?.close();
        try {
          sessionStorage.removeItem('omakase-last-view');
        } catch {
          /* Best-effort fallback; canonical server state is unchanged. */
        }
        closeModal();
        renderLogin();
      } else {
        online = false;
        if (renderPage && S) render();
        throw e;
      }
    }
  }

  function connectEvents() {
    stream?.close();
    if (mode !== 'shared' || !S) return;
    let closed = false,
      timeout = null,
      controller = null,
      delay = 20000,
      generation = 0,
      lastPollAt = -Infinity;
    const close = () => {
      closed = true;
      generation++;
      clearTimeout(timeout);
      controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', focus);
    };
    const schedule = () => {
      clearTimeout(timeout);
      if (!closed && !document.hidden)
        timeout = setTimeout(poll, delay + Math.random() * 1500);
    };
    const poll = async () => {
      if (closed || document.hidden || !S) return;
      lastPollAt = Date.now();
      const current = ++generation;
      clearTimeout(timeout);
      controller?.abort();
      controller = new AbortController();
      try {
        const r = await fetch('/api/sync?after=' + S.seq, {
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (closed || current !== generation) return;
        if (r.status === 401) {
          close();
          S = null;
          closeModal();
          renderLogin();
          toast('Open the current invitation to join again.', true);
          return;
        }
        if (!r.ok) throw Error('Sync unavailable');
        if (
          r.headers.get('X-Omakase-Release') &&
          r.headers.get('X-Omakase-Release') !== CLIENT_RELEASE
        ) {
          close();
          online = false;
          render();
          toast(
            'A new edition is ready. Reload this page before making changes; keep any unsent draft.',
            true,
          );
          return;
        }
        const wasOffline = !online;
        online = true;
        delay = 20000;
        if (r.status !== 204)
          acceptState(
            await r.json(),
            !document.querySelector('#main input:focus,#main textarea:focus'),
          );
        else if (wasOffline) render();
      } catch (e) {
        if (current === generation && e.name !== 'AbortError') {
          delay = Math.min(90000, delay * 1.5);
          if (online) {
            online = false;
            render();
          }
        }
      } finally {
        if (current === generation) schedule();
      }
    };
    const visibility = () => {
      clearTimeout(timeout);
      if (document.hidden) controller?.abort();
      else poll();
    };
    const focus = () => {
      if (!document.hidden && Date.now() - lastPollAt > 1000) poll();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', focus);
    stream = { close };
    schedule();
  }

  function route(view) {
    ui.view = view;
    ui.limit = 24;
    closeModal();
    history.pushState(null, '', (mode === 'demo' ? '#demo/' : '#') + view);
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.addEventListener('popstate', () => {
    const view = location.hash.replace(/^#(?:demo\/)?/, '');
    if (S && ['plans', 'day', 'discover', 'people', 'story'].includes(view)) {
      ui.view = view;
      closeModal();
      render();
    }
  });
  window.addEventListener('hashchange', async () => {
    const params = new URLSearchParams(location.hash.slice(1));
    if (S) {
      const planId = params.get('plan');
      if (planId) {
        try {
          await refresh(false);
          showPlan(planId);
        } catch (e) {
          toast(errText(e), true);
        }
      }
      return;
    }
    joinToken = params.get('join') || '';
    setupKey = params.get('setup') || '';
    deviceKey = params.get('device') || '';
    pendingPlan = params.get('plan') || '';
    if (deviceKey) init();
    else renderLogin();
  });
  function header() {
    const unread = countUpdates();
    return `<div class="tagbar"><span>${mode === 'demo' ? 'EXAMPLE TRIP <span class="tag-demo-description">· FICTIONAL PEOPLE · LOCAL ONLY</span>' : 'DIFFERENT PLANS. SAME FRIENDS.'}</span>${mode === 'demo' ? `<div class="demo-controls"><label class="screenreader" for="demo-person">Example traveler</label><span>Try as</span><select id="demo-person">${S.members.map((m) => `<option value="${E(m.id)}" ${m.id === S.me.id ? 'selected' : ''}>${E(m.name)}</option>`).join('')}</select><button data-action="live-info">Go live</button></div>` : '<span class="tag-second">JAPAN · OUR OWN DAYS</span>'}</div><header class="header"><div class="header-inner"><button class="brand" data-nav="plans" aria-label="Adventure Omakase home"><span class="brand-name">omakase<span class="brand-star">✳</span><small>THE TOGETHER, APART EDITION</small></span></button><nav class="nav" aria-label="Main navigation">${navButtons(false)}</nav><div class="header-actions">${btn(I('plus') + '<span class="invite-label">Open a plan</span>', 'plan-new', '', 'primary')}<button class="icon-btn" data-action="updates" aria-label="Trip updates${unread ? `, ${unread} unread` : ''}">${I('bell')}${unread ? `<span class="dot-count">${Math.min(unread, 9)}</span>` : ''}</button><button data-action="profile" aria-label="Your profile and travel dates" style="padding:0">${avatar(S.me.id)}</button></div></div></header>${!online && mode === 'shared' ? '<div class="offline">Offline · last loaded view only. Joining and plan changes are disabled. <button class="text-btn" data-action="reconnect">Reconnect</button></div>' : ''}${mode === 'demo' && !S.storageOkay ? '<div class="offline">This browser cannot keep the example between visits. Export anything you wish to retain.</div>' : ''}`;
  }
  function navButtons(mobile) {
    return [
      ['plans', 'Open plans', 'route', 'Plans'],
      ['day', 'My day', 'calendar', 'My day'],
      ['discover', 'Discover', 'search', 'Discover'],
      ['people', 'People', 'people', 'People'],
      ['story', 'Our story', 'book', 'Story'],
    ]
      .map(
        ([v, n, i, short]) =>
          `<button data-nav="${v}" class="${ui.view === v ? 'active' : ''}" ${ui.view === v ? 'aria-current="page"' : ''}>${mobile ? I(i) : ''}<span>${mobile ? short : n}</span></button>`,
      )
      .join('');
  }
  function footer() {
    return `<footer class="footer"><div><strong>Adventure Omakase</strong> · Together, apart.<br>300 research leads. No compulsory itinerary. No location tracking.</div><div class="row wrap"><button data-action="invite">Invite friends</button><button data-action="legacy">Fieldbook</button><button data-action="settings">Trip settings</button></div></footer>`;
  }
  function render() {
    if (!S) {
      renderLogin();
      return;
    }
    app.innerHTML =
      header() +
      `<div class="container"><div class="meta-line"><span>${E(S.trip.name)} <span class="muted">/ ${E(S.me.name)}’s view</span></span><span class="row"><span class="meta-date">${dateText(S.trip.start)} — ${dateText(S.trip.end)}</span><span>${mode === 'demo' ? 'Local example' : `<i class="live-dot"></i>${online ? 'Shared trip' : 'Offline copy'}`} · JST</span></span></div>${mode === 'shared' ? '<nav class="travel-rail" aria-label="Travel tools"><span class="eyebrow">On the road</span><button data-travel="open" data-value="places">Nearby places</button><button data-travel="open" data-value="search">Research</button><button data-travel="open" data-value="route">Directions</button><button data-travel="open" data-value="translate">Translate</button><button data-travel="open" data-value="memory">Tell a memory</button><button data-travel="watches">My checks</button></nav>' : ''}<main id="main" tabindex="-1">${({ plans: board, day: myDay, discover: discover, people: peoplePage, story: storyPage }[ui.view] || board)()}</main>${footer()}</div><nav class="nav-dock" aria-label="Quick navigation">${navButtons(true)}</nav>`;
    if (ui.view === 'day')
      requestAnimationFrame(() => {
        const strip = document.querySelector('.calendar-strip'),
          active = strip?.querySelector('.date-btn.active');
        if (active)
          strip.scrollLeft +=
            active.getBoundingClientRect().left -
            strip.getBoundingClientRect().left -
            strip.clientWidth / 2 +
            active.clientWidth / 2;
      });
  }
  function regionFilters(type) {
    return `<div class="filters">${['all', 'tokyo', 'osaka', 'okinawa'].map((r) => `<button class="filter ${ui.region === r ? 'active' : ''}" data-action="region" data-id="${r}">${r === 'all' ? 'All places' : R[r]}</button>`).join('')}${type === 'board' ? `<label class="screenreader" for="board-day">Filter plan date</label><select id="board-day"><option value="all">Any day</option>${DAYS.map((d) => `<option value="${d}" ${ui.boardDay === d ? 'selected' : ''}>${dateText(d)}</option>`).join('')}</select><button class="filter ${ui.mine ? 'active' : ''}" data-action="my-invites" aria-pressed="${ui.mine}">My invitations</button>` : ''}</div>`;
  }
  function matchingPlans() {
    return S.plans
      .filter(
        (p) =>
          (ui.region === 'all' || p.region === ui.region) &&
          (ui.boardDay === 'all' || p.date === ui.boardDay) &&
          (!ui.mine || p.hostId === S.me.id),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
      );
  }
  function board() {
    const hasFriends = S.members.filter((m) => m.active).length > 1;
    const plans = matchingPlans().filter((p) => p.status === 'open');
    return `<section class="hero"><div><div class="eyebrow">Make room for a little company.</div><h1>Your own trip.<br>Good company,<br><em>when you want it.</em></h1><p>Go where you’re curious. Put a plan out there.<br>Friends can join the whole thing, just a part, or catch you afterward. No explanations required.</p><div class="row wrap">${btn(I('plus') + 'I’m thinking of doing…', 'plan-new', '', 'primary')}${btn('Find a little adventure ' + I('arrow'), 'discover-nav', '', 'subtle')}${mode === 'shared' ? btn('Find something for me ✳', 'ask-find', '', 'subtle') : ''}</div></div><div class="hero-art" aria-label="Decorative Japan travel illustrations"><span class="art-disclosure">Imaginative illustrations · not venue photographs</span><div class="hero-photo one"><img src="${E(A.street)}" alt="Illustrated narrow Japanese street"><small>One more little detour.</small></div><div class="hero-photo two"><img src="${E(A.bridge)}" alt="Illustrated island bridge and blue water"><small>No need to take the same route.</small></div><div class="hero-note"><div class="eyebrow">The only standing invitation</div><strong>Tell us what you found.</strong><div class="small muted">A story is a perfectly good way to join in.</div></div></div></section><div class="chapter-rail">${[
      ['tokyo', '01', 'Small streets. Big curiosity.'],
      ['osaka', '02', 'Good food. Longer detours.'],
      ['okinawa', '03', 'Island time. Your own pace.'],
    ]
      .map(
        ([r, n, t]) =>
          `<button class="chapter" data-action="chapter" data-id="${r}"><span class="chapter-num">${n}</span><span><span class="chapter-title">${r === 'osaka' ? 'Osaka' : R[r]}</span><small>${t}</small></span>${I('arrow')}</button>`,
      )
      .join(
        '',
      )}</div><section><div class="section-heading"><div><div class="eyebrow">The invitation board</div><h2>Who’s up for what?</h2><p>Open plans, not obligations. Everything here is optional.</p></div><button class="text-btn" data-action="plan-new">Start something ${I('plus')}</button></div><div class="body-split"><div>${regionFilters('board')}<div class="invitation-list">${plans.length ? plans.map(invitation).join('') : empty('The day is still yours.', 'No open plans in this view. Start one, widen your filters, or leave the day unplanned.', 'Open a plan', 'plan-new')}</div>${
      S.plans.some((p) => p.status !== 'open')
        ? `<details class="form-detail"><summary>Closed plans · ${S.plans.filter((p) => p.status !== 'open').length}</summary><div class="invitation-list">${matchingPlans()
            .filter((p) => p.status !== 'open')
            .map(invitation)
            .join('')}</div></details>`
        : ''
    }</div><aside class="side-column"><div class="sidecard"><div class="eyebrow">People, not a headcount</div><h3>${hasFriends ? 'Friends in the mix.' : 'Start with your people.'}</h3><p>${hasFriends ? 'Travel windows are shared by each person. Nobody is being tracked.' : 'Invite friends, then let everyone add their own dates and places. No master itinerary needed.'}</p>${S.members
      .filter((m) => m.active && m.id !== S.me.id)
      .slice(0, 4)
      .map(
        (m) =>
          `<div class="friend-line">${avatar(m.id)}<div><strong>${E(m.name)}</strong><small>${
            m.profile?.windows?.length
              ? m.profile.windows
                  .map((w) => R[w.region])
                  .filter((x, i, a) => a.indexOf(x) === i)
                  .join(' · ')
              : 'Dates not shared yet'
          }</small></div></div>`,
      )
      .join(
        '',
      )}${btn(hasFriends ? 'See where we overlap ' + I('arrow') : 'Invite friends ' + I('plus'), hasFriends ? 'people-nav' : 'invite', '', 'subtle')}</div><div class="sidecard dark"><div class="symbol">✳</div><h3>A little less planning.</h3><p>Pick a place and a mood. We’ll draw one discovery. You decide whether to make it an invitation.</p>${btn('Draw a discovery ' + I('dice'), 'dice')}</div><div class="sidecard"><div class="eyebrow">A useful distinction</div><h3>Joined ≠ booked.</h3><p>Joining tells a friend you’re interested in coming. Tickets, tables, ferries and operator approvals still need a separate confirmation.</p></div></aside></div></section>`;
  }
  function invitation(p) {
    const r = myR(p),
      host = person(p.hostId),
      members = joined(p),
      mine = p.hostId === S.me.id,
      needs =
        r?.status === 'joined' &&
        r.acceptedRevision !== p.revision &&
        p.status === 'open';
    let tag = mine
      ? 'Your invitation'
      : r?.status === 'joined'
        ? needs
          ? 'Please reconfirm'
          : 'You’re joining'
        : r?.status === 'interested'
          ? 'You’re interested'
          : r?.status === 'waitlist'
            ? 'On waitlist'
            : p.kind === 'idea'
              ? 'Who’s keen?'
              : 'I’m going';
    return `<article class="invitation ${p.status === 'cancelled' ? 'cancelled' : ''} ${needs ? 'changed' : ''}" data-plan-card="${E(p.id)}"><div class="date-column"><small>${dateText(p.date, { month: 'short' })}</small><b>${E(p.date.slice(-2))}</b><small>${dateText(p.date, { weekday: 'short' })}</small><span class="vertical">${p.region === 'osaka' ? 'Osaka' : R[p.region]}</span></div><div class="invitation-content">${needs ? '<div class="tiny-banner">Details changed since you joined. Take another look.</div>' : ''}<div class="row invitation-header">${avatar(p.hostId)}<div class="host-name grow">${E(host.name)} <span>· ${mine ? 'hosting' : 'an open invitation'}</span></div><span class="pill ${p.status !== 'open' ? '' : needs || p.kind === 'idea' ? 'rust' : 'green'}">${p.status !== 'open' ? E(p.status) : tag}</span></div><button class="invite-title" data-action="plan-detail" data-id="${E(p.id)}">${E(p.title)}</button><p class="invite-description">${E(p.description.length > 185 ? p.description.slice(0, 182) + '…' : p.description)}</p><div class="invite-meta"><span>${I('clock')}${formatTime(p)} JST</span><span>${I('pin')}${E(p.area)}</span>${p.capacity ? `<span>${I('people')}${1 + members.length}/${E(p.capacity)} places incl. host</span>` : ''}</div><div class="invite-footer"><div><div class="row" style="gap:8px"><span class="avatar-stack">${avatar(p.hostId)}${members
      .slice(0, 3)
      .map((r) => avatar(r.memberId))
      .join(
        '',
      )}</span><span class="small">${members.length ? `${1 + members.length} going${members.some((r) => r.choice !== 'all') ? ' · some just for part' : ''}` : 'Company welcome'}</span></div>${p.joinStyle === 'reunion' ? `<div class="reunion-ribbon">${I('coffee')} Solo first. Meet afterward.</div>` : p.segments.length ? `<div class="reunion-ribbon">${I('route')} Join all of it, or choose a part.</div>` : ''}</div>${btn(p.status !== 'open' ? 'View plan' : mine ? 'Your plan ' + I('arrow') : needs ? 'Reconfirm ' + I('arrow') : 'Take a look ' + I('arrow'), 'plan-detail', p.id, mine ? 'subtle' : '')}</div></div></article>`;
  }
  function empty(title, message, label = '', action = '') {
    return `<div class="empty">${I('sun')}<h3>${E(title)}</h3><p>${E(message)}</p>${label ? btn(E(label) + ' ' + I('arrow'), action, '', 'primary') : ''}</div>`;
  }
  function myDay() {
    const plans = S.plans
      .filter((p) => p.date === ui.day && myPlan(p))
      .sort((a, b) =>
        (segment(a, myR(a))?.start || a.start).localeCompare(
          segment(b, myR(b))?.start || b.start,
        ),
      );
    const possible = S.plans.filter(
      (p) => p.date === ui.day && p.status === 'open' && !myPlan(p),
    );
    const windows =
      S.me.profile?.windows?.filter(
        (w) => w.from <= ui.day && ui.day <= w.to,
      ) || [];
    const overlaps = [];
    for (let i = 0; i < plans.length; i++)
      for (let j = i + 1; j < plans.length; j++) {
        let a = segment(plans[i], myR(plans[i])) || plans[i],
          b = segment(plans[j], myR(plans[j])) || plans[j];
        if (
          plans[i].status === 'open' &&
          plans[j].status === 'open' &&
          a.start < b.end &&
          b.start < a.end
        )
          overlaps.push([plans[i], plans[j]]);
      }
    return `<section class="page-head day-head"><div class="eyebrow">Only the parts you chose</div><h1>Your day. <em>Your pace.</em></h1><p>Only what you host or join. Everything else is optional. Times in Japan.</p></section><div class="calendar-strip" aria-label="Choose your day">${DAYS.map((d) => `<button class="date-btn ${ui.day === d ? 'active' : ''}" data-action="day" data-id="${d}" aria-label="${dateText(d, { month: 'long', day: 'numeric', weekday: 'long' })}" aria-pressed="${ui.day === d}"><small>${dateText(d, { weekday: 'short' })}</small><b>${E(d.slice(-2))}</b><small>${dateText(d, { month: 'short' })}</small>${S.plans.some((p) => p.date === d && myPlan(p)) ? '<span class="day-dot"></span>' : '<span style="height:8px"></span>'}</button>`).join('')}</div><div class="section-heading"><div><h2>${dateText(ui.day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><p>${windows.length ? windows.map((w) => E(w.area || R[w.region])).join(' · ') + ' · based on your shared travel dates' : 'No travel area shared for this date. You can still choose plans anywhere.'}</p></div>${btn(I('download') + 'Calendar', 'calendar-day', '', 'subtle')}</div>${overlaps.length ? `<div class="notice warn">${I('clock')} You have overlapping commitments: ${overlaps.map(([a, b]) => `${E(a.title)} / ${E(b.title)}`).join('; ')}. We have not calculated travel time between any plans.</div>` : ''}<div class="day-layout"><div>${
      plans.length
        ? plans
            .map((p) => {
              const r = myR(p),
                part = segment(p, r),
                missingPart = r && r.choice !== 'all' && !part,
                needs =
                  r?.status === 'joined' &&
                  r.acceptedRevision !== p.revision &&
                  p.status === 'open';
              return `<article class="commitment ${p.status === 'cancelled' ? 'cancelled' : ''}"><time>${missingPart ? 'Your selected part was removed' : formatTime(part || p) + ' JST'} ${part ? '· just your part' : ''}</time><h3>${E(part ? part.label : p.title)}</h3><p>${part ? E(p.title) + '<br>' : ''}${E(missingPart ? 'Choose a new part before treating this as a commitment.' : part?.meeting || p.meeting)}</p><div class="row wrap"><span class="pill ${needs ? 'rust' : 'green'}">${p.status !== 'open' ? E(p.status) : needs ? 'Reconfirm changed details' : p.hostId === S.me.id ? 'You’re hosting' : 'You’re joining'}</span>${btn('Meeting details ' + I('arrow'), 'plan-detail', p.id, 'subtle')}</div></article>`;
            })
            .join('')
        : empty(
            'Nothing you have to do.',
            'There are no joined plans on this day. That is a feature, not a problem. Make something happen—or leave it that way.',
            'Open a plan',
            'plan-new',
          )
    }<div class="section-heading" style="margin-top:35px"><div><div class="eyebrow">Optional company</div><h3>Other invitations this day</h3></div></div><div class="invitation-list">${possible.length ? possible.map(invitation).join('') : '<p class="muted small">No other open invitations yet.</p>'}</div></div><aside><div class="sidecard dark"><div class="eyebrow">A small daily invitation</div><h3>Bring back one thing we missed.</h3><p>A detail, a dish, a very ordinary moment. Doing different things gives us more stories, not less.</p>${btn(I('camera') + 'Leave a memory', 'moment-new')}</div><div class="sidecard"><div class="eyebrow">No surprises about commitments</div><h3>Check before you go.</h3><p>Meeting points are supplied by friends. Transport, reservations, last departures and activity safety are not automatically checked by this app.</p>${btn('Your travel windows ' + I('arrow'), 'profile', '', 'subtle')}</div></aside></div>`;
  }
  function discoverMatches() {
    return C.filter(
      (a) =>
        (ui.region === 'all' || a.region === ui.region) &&
        (ui.mood === 'all' || a.mood === ui.mood) &&
        (ui.area === 'all' || a.area === ui.area) &&
        (ui.max === 'all' || a.minutes <= +ui.max) &&
        (!ui.saved || saved(a.id)) &&
        (!ui.q ||
          norm(a.title + ' ' + a.area + ' ' + a.why + ' ' + a.cluster).includes(
            norm(ui.q),
          )),
    );
  }
  function discoveryCard(a) {
    const pick = saved(a.id),
      friends = S.picks.filter(
        (p) => p.catalogueId === a.id && p.shared && p.memberId !== S.me.id,
      );
    return `<article class="discovery ${a.featured ? 'featured' : ''}"><div class="row between"><span class="number">${a.custom ? 'FRIEND’S FIND' : E(a.region.toUpperCase().slice(0, 3) + ' / ' + String(a.n).padStart(3, '0'))}</span><span class="pill">${I(MOODS[a.mood])}${E(a.mood)}</span></div><h3><button data-action="discovery" data-id="${E(a.id)}">${E(a.title)}</button></h3><p>${E(a.why)}</p>${a.custom ? `<p class="find-author">Found by ${E(person(a.memberId).name)}</p>` : ''}<div class="bottom"><span>${E(a.area)}<br>${E(a.minutes < 60 ? a.minutes + ' min' : (a.minutes / 60).toFixed(a.minutes % 60 ? 1 : 0) + ' hr')} on site · estimate${friends.length ? `<br>${friends.map((f) => E(person(f.memberId).name)).join(', ')} saved this` : ''}</span><button class="icon-btn ${pick ? 'saved-star' : ''}" data-action="save" data-id="${E(a.id)}" aria-label="${pick ? 'Unsave' : 'Save'} ${E(a.title)}" aria-pressed="${!!pick}">${I(pick ? 'check' : 'save')}</button></div></article>`;
  }
  function discover() {
    const matches = discoverMatches(),
      areas = [
        ...new Set(
          C.filter((a) => ui.region === 'all' || a.region === ui.region).map(
            (a) => a.area,
          ),
        ),
      ].sort();
    return `<section class="page-head"><div class="eyebrow">The fieldbook · 300 ideas + our own finds</div><h1>A little more <em>curious.</em></h1><p>Keep something for yourself, recommend it to friends, or turn it into an open invitation. Most entries are research leads—not confirmed plans.</p><div class="row wrap">${btn(I('plus') + 'Add a friend’s find', 'find-new', '', 'primary')}</div></section>${regionFilters()}<div class="searchbar">${I('search')}<label class="screenreader" for="search">Search discoveries</label><input id="search" type="search" placeholder="A place, a craving, a very specific curiosity…" value="${E(ui.q)}" autocomplete="off"></div><div class="filters">${['all', ...Object.keys(MOODS)].map((m) => `<button class="filter ${ui.mood === m ? 'active' : ''}" data-action="mood" data-id="${m}">${m === 'all' ? 'Any mood' : m}</button>`).join('')}<button class="filter ${ui.saved ? 'active' : ''}" data-action="saved-only" aria-pressed="${ui.saved}">${I('save')} My saved ideas</button></div><div class="filters"><label class="screenreader" for="area-filter">Discovery area</label><select id="area-filter"><option value="all">Any neighborhood / island</option>${areas.map((a) => `<option ${a === ui.area ? 'selected' : ''}>${E(a)}</option>`).join('')}</select><label class="screenreader" for="time-filter">Estimated time on site</label><select id="time-filter">${[
      ['all', 'Any time on site'],
      ['60', 'Up to 1 hr on site'],
      ['120', 'Up to 2 hr on site'],
      ['240', 'Up to 4 hr on site'],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${ui.max === v ? 'selected' : ''}>${l}</option>`,
      )
      .join(
        '',
      )}</select><span class="small muted" id="result-count">${matches.length} discoveries · travel time excluded</span><button class="text-btn" data-action="clear-filters">Reset</button></div><div class="discovery-grid" id="discovery-results">${matches.slice(0, ui.limit).map(discoveryCard).join('')}</div>${!matches.length ? empty('That is quite a specific adventure.', 'Try another area or relax a filter. Nothing has been invented to fill the gap.', 'Reset filters', 'clear-filters') : ''}${matches.length > ui.limit ? `<div class="row" style="justify-content:center;margin-top:28px">${btn('Show 24 more ' + I('plus'), 'more')}</div>` : ''}<div class="envelopes"><button class="envelope" data-action="envelope" data-id="Strange"><span class="eyebrow">Open when…</span><h3>You want something strange.</h3></button><button class="envelope" data-action="envelope" data-id="Food"><span class="eyebrow">Open when…</span><h3>Dinner needs a decision.</h3></button><button class="envelope" data-action="envelope" data-id="Slow"><span class="eyebrow">Open when…</span><h3>Doing less sounds lovely.</h3></button></div>`;
  }
  function overlapWith(member) {
    const mine = S.me.profile?.windows || [],
      theirs = member.profile?.windows || [],
      parts = [];
    for (const a of mine)
      for (const b of theirs) {
        const from = a.from > b.from ? a.from : b.from,
          to = a.to < b.to ? a.to : b.to;
        if (a.region === b.region && from <= to)
          parts.push(
            `${R[a.region]} · ${dateText(from)}${to !== from ? '–' + dateText(to) : ''}`,
          );
      }
    return [...new Set(parts)];
  }
  function peoplePage() {
    const members = S.members.filter((m) => m.active);
    return `<section class="page-head"><div class="eyebrow">Together doesn’t have to mean identical</div><div class="row between wrap"><h1>Cross paths.<br><em>Keep your own pace.</em></h1>${btn(I('plus') + 'Invite a friend', 'invite', '', 'primary')}</div><p>Everyone owns their dates and their decisions. These are voluntarily shared travel windows—not live locations or hotel addresses.</p></section><div class="section-heading"><div><h3>Where we might overlap</h3><p>Same region does not mean nearby. Check island, neighborhood and transport before making plans.</p></div><button class="text-btn" data-action="profile">Edit my dates ${I('edit')}</button></div><div class="scroll-hint">Scroll the date strip on smaller screens.</div><div class="timeline-wrap"><div class="window-timeline"><div></div>${DAYS.map((d) => `<div class="head">${E(d.slice(-2))}<br>${dateText(d, { month: 'short' })}</div>`).join('')}${members
      .map(
        (m) =>
          `<div class="name">${avatar(m.id)} ${E(m.name)}</div>${DAYS.map(
            (d) => {
              const w = m.profile?.windows?.find(
                (w) => w.from <= d && d <= w.to,
              );
              return `<div class="day-cell ${E(w ? w.region : '')}" title="${E(m.name)} · ${dateText(d)} · ${E(w ? `${R[w.region]} / ${w.area || 'area not specified'}` : 'not shared')}" aria-label="${E(m.name + ' ' + dateText(d) + ' ' + (w ? R[w.region] : 'not shared'))}"></div>`;
            },
          ).join('')}`,
      )
      .join(
        '',
      )}</div></div><div class="row wrap" style="margin-bottom:25px"><span class="key"><i></i>Tokyo</span><span class="key"><i class="osaka"></i>Osaka & beyond</span><span class="key"><i class="okinawa"></i>Okinawa</span><span class="small muted">Blank = dates not shared, not absence.</span></div><div class="portrait-grid">${members
      .map((m) => {
        const overlap = m.id !== S.me.id ? overlapWith(m) : [];
        return `<article class="portrait-card">${avatar(m.id)}<h3>${E(m.name)}${m.id === S.me.id ? ' <small class="muted">you</small>' : ''}</h3><span class="pill">${m.role === 'owner' ? 'Trip owner' : 'Free to roam'}</span><p>${E(m.profile?.bio || 'A little room for getting to know each other along the way.')}</p>${m.profile?.interests ? `<p><strong>Drawn to</strong><br>${E(m.profile.interests)}</p>` : ''}${(m.profile?.windows || []).map((w) => `<div class="window-chip"><span><i class="region-chip ${E(w.region)}"></i> ${E(w.area || R[w.region])}</span><span>${dateText(w.from)}–${dateText(w.to)}</span></div>`).join('') || '<p class="small muted">Travel dates not shared yet.</p>'}${overlap.length ? `<div class="overlap"><strong>You overlap in the same region</strong><br>${overlap.map(E).join('<br>')}</div>` : ''}<div class="card-actions">${m.id === S.me.id ? btn('Edit my profile ' + I('edit'), 'profile', '', 'subtle') : btn('See their invitations ' + I('arrow'), 'person-plans', m.id, 'subtle')}</div></article>`;
      })
      .join('')}</div>`;
  }
  function storyPage() {
    const moments = S.moments
      .filter((m) =>
        ui.story === 'group'
          ? m.visibility === 'group'
          : m.memberId === S.me.id,
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.created.localeCompare(a.created),
      );
    return `<section class="page-head"><div class="eyebrow">The book we actually finish</div><div class="row between wrap"><h1>Different days.<br><em>More stories.</em></h1>${btn(I('plus') + 'Add a memory', 'moment-new', '', 'primary')}</div><p>The tiny place you found. The snack nobody agreed on. One photo, one sentence, or nothing today. New memories go straight into our shared book. Different days give us more stories.</p></section><div class="subnav"><button class="${ui.story === 'group' ? 'active' : ''}" data-action="story-filter" data-id="group">Our shared story</button><button class="${ui.story === 'mine' ? 'active' : ''}" data-action="story-filter" data-id="mine">My contributions</button></div><div class="section-heading"><div><span class="small muted">${moments.length} ${moments.length === 1 ? 'memory' : 'memories'} · ${ui.story === 'group' ? 'shared by their authors' : 'visible to you'}</span></div><button class="text-btn" data-action="print-story">Make the return edition ${I('book')}</button></div>${
      moments.length
        ? `<div class="memory-grid">${moments
            .map(
              (m) =>
                `<article class="memory ${m.visibility === 'private' ? 'private' : ''}">${m.photos?.length ? `<img src="${E(photo(m.photos[0]))}" alt="Photo contributed by ${E(person(m.memberId).name)}" loading="lazy">` : ''}<span class="pill ${m.visibility === 'group' ? 'green' : ''}">${I(m.visibility === 'group' ? 'people' : 'lock')}${m.visibility === 'group' ? 'Shared with this trip' : 'Only you'}</span><h3>${E(m.title || 'One thing worth keeping')}</h3><p>${E(m.text)}</p>${
                  m.photos?.length > 1
                    ? `<div class="preview-photos">${m.photos
                        .slice(1)
                        .map(
                          (id) =>
                            `<img src="${E(photo(id))}" alt="Additional memory photograph" loading="lazy">`,
                        )
                        .join('')}</div>`
                    : ''
                }<div class="author">${E(person(m.memberId).name)} · ${dateText(m.date)} · ${R[m.region]}</div>${m.memberId === S.me.id ? `<div class="row">${btn(I('edit') + 'Edit', 'moment-edit', m.id, 'subtle')}${btn(I('trash') + 'Delete', 'moment-delete', m.id, 'subtle')}</div>` : ''}</article>`,
            )
            .join('')}</div>`
        : empty(
            'Leave the first little trace.',
            'There are no prewritten memories here. This book should contain what actually happened—not what the app imagined.',
            'Add a memory',
            'moment-new',
          )
    }`;
  }
  function openModal(title, html, type = 'generic', id = '', wide = false) {
    lastFocus = document.activeElement;
    modal = { type, id, revision: S?.plans.find((p) => p.id === id)?.revision };
    dialog.className = wide ? 'wide' : '';
    dialog.innerHTML = `<div class="dialog-top"><span class="eyebrow" id="dialog-title">${E(title)}</span><button class="icon-btn" data-action="close" aria-label="Close dialog">${I('close')}</button></div><div class="dialog-body">${html}</div>`;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('no-scroll');
    dialog.querySelector('[data-action=close]').focus();
  }
  function closeModal() {
    if (dialog.open) dialog.close();
    dialog.innerHTML = '';
    modal = null;
    draftPhotos = [];
    photoBusy = false;
    document.body.classList.remove('no-scroll');
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function showPlan(id) {
    const p = S.plans.find((p) => p.id === id);
    if (!p) return;
    const mine = p.hostId === S.me.id,
      r = myR(p),
      members = joined(p),
      full =
        !!p.capacity &&
        1 + members.length >= p.capacity &&
        r?.status !== 'joined',
      needs =
        r?.status === 'joined' &&
        r.acceptedRevision !== p.revision &&
        p.status === 'open';
    const a = BY.get(p.catalogueId);
    openModal(
      'An open invitation',
      `<div class="row wrap"><span class="pill ${p.kind === 'idea' ? 'rust' : 'green'}">${p.status !== 'open' ? E(p.status) : p.kind === 'idea' ? 'An idea · not yet decided' : 'I’m going · company welcome'}</span>${p.joinStyle === 'reunion' ? '<span class="pill blue">Solo first · meet afterward</span>' : ''}</div><h2 style="margin-top:17px">${E(p.title)}</h2><div class="detail-date">${I('calendar')}${dateText(p.date, { weekday: 'long', month: 'long', day: 'numeric' })} <span>·</span>${formatTime(p)} JST</div><div class="plan-share-row">${btn(I('arrow') + 'Send this invitation', 'share-plan', p.id, 'subtle')}${mode === 'shared' ? btn('Check this idea ✳', 'ask-plan', p.id, 'subtle') + (mine && p.status === 'open' && p.segments.length && new Set(p.segments.map((s) => s.label)).size === p.segments.length ? btn('Help me rework this', 'ask-replan', p.id, 'subtle') : '') : ''}</div><div class="detail-host">${avatar(p.hostId)}<div>${E(person(p.hostId).name)} is hosting<small>You’re welcome for the parts that suit you.</small></div></div><p class="lede" style="white-space:pre-wrap">${E(p.description)}</p>${mode === 'demo' ? '<div class="notice warn">Example plan with fictional people. Meeting points and availability are deliberately not verified. Nothing here is booked.</div>' : ''}${needs ? '<div class="notice warn"><strong>This changed since you joined.</strong><br>Review the current time, meeting point and selected part, then reconfirm. A changed plan does not silently change your commitment.</div>' : ''}<div class="meeting-box"><span class="eyebrow">Where to find us · supplied by the host</span><strong>${E(p.meeting)}</strong><a class="text-btn" href="${E(safeURL(p.mapLink) || mapSearch(p))}" target="_blank" rel="noopener noreferrer">${I('pin')}${safeURL(p.mapLink) ? 'Open host’s map link' : 'Search this meeting point in Maps'} ${I('external')}</a></div><div class="fact-grid"><div class="fact"><small>Effort</small><strong>${{ easy: 'Easy pace', active: 'Active outing', demanding: 'Demanding outing' }[p.effort]}</strong></div><div class="fact"><small>Expected cost</small><strong>${E(p.cost || 'Not supplied · ask the host')}</strong></div><div class="fact"><small>Booking</small><strong>${{ check: 'Still needs checking', 'not-needed': 'Host says no booking needed', 'host-booked': 'Host has booked for themselves' }[p.booking]}</strong></div></div>${p.booking === 'host-booked' ? '<div class="notice warn">The host’s booking does not include you automatically. Confirm your own place or ask the host before paying or traveling.</div>' : ''}${a ? `<div class="notice">From the fieldbook: <button class="text-btn" data-action="discovery" data-id="${E(a.id)}">${E(a.title)} ${I('arrow')}</button><br>${a.flags.includes('w') ? 'Water activity: operator approval, conditions and safety must be confirmed separately. ' : ''}${a.flags.includes('o') ? 'A separate stay or island transfer may be needed. ' : ''}Catalogue durations exclude travel time. This invitation is not a checked route.</div>` : ''}${(mine || p.status !== 'open') && p.segments.length ? `<section class="meeting-parts"><div class="section-label">Smaller meet-up parts</div>${p.segments.map((s) => `<div class="choose-part"><span><strong>${E(s.label)}</strong><small>${formatTime(s)} JST</small><small>${E(s.meeting)}</small></span></div>`).join('')}</section>` : ''}${p.status === 'open' && !mine ? `<form id="rsvp-form" data-plan="${E(p.id)}" data-revision="${E(p.revision)}"><div class="section-label">How would you like to join?</div>${p.joinStyle === 'open' ? `<label class="choose-part"><input type="radio" name="choice" value="all" ${!r || r.choice === 'all' ? 'checked' : ''}><span><strong>All of it</strong><small>${formatTime(p)} JST · main meeting point above</small></span></label>` : ''}${p.segments.map((s, i) => `<label class="choose-part"><input type="radio" name="choice" value="${E(s.id)}" ${r?.choice === s.id || (!r && p.joinStyle === 'reunion' && i === 0) ? 'checked' : ''}><span><strong>${E(s.label)}</strong><small>${formatTime(s)} JST</small><small>${E(s.meeting)}</small></span></label>`).join('')}<div class="form-error" role="alert"></div><div id="overlap-choice"></div><div class="row wrap" style="margin-top:20px"><button type="submit" name="status" value="${full ? 'waitlist' : 'joined'}" class="btn primary">${full ? 'Join the waitlist' : needs ? 'Reconfirm my part' : r?.status === 'joined' ? 'Update my part' : 'I’m coming'} ${I('arrow')}</button><button type="submit" name="status" value="interested" class="btn">Interested, not committed</button>${r ? `<button type="submit" name="status" value="leave" class="text-btn">Leave this plan</button>` : ''}</div><p class="time-note">${p.capacity ? `${1 + members.length} of ${E(p.capacity)} places including the host. ` : ''}One group-wide capacity applies to all parts. Waitlists are not auto-promoted. Joining never purchases a ticket.</p></form>` : mine && p.status === 'open' ? `<div class="row wrap" style="margin-top:25px">${btn(I('edit') + 'Edit invitation', 'plan-edit', p.id, 'primary')}${btn(I('check') + 'Mark completed', 'plan-complete', p.id)}${btn('Cancel plan', 'plan-cancel', p.id, 'danger')}</div>` : ''}<div class="section-label">Who’s in the picture?</div><div class="person-rsvp">${avatar(p.hostId)}<span>${E(person(p.hostId).name)}<small>Hosting</small></span></div>${p.rsvps.map((r) => `<div class="person-rsvp">${avatar(r.memberId)}<span>${E(person(r.memberId).name)}<small>${E(r.status)}${r.choice !== 'all' ? ' · ' + E(p.segments.find((s) => s.id === r.choice)?.label || 'option changed') : ' · all of it'}${p.status === 'open' && r.status === 'joined' && r.acceptedRevision !== p.revision ? ' · needs to reconfirm' : ''}</small></span></div>`).join('') || '<p class="small muted" style="margin-top:14px">Nobody else has committed. That is absolutely fine.</p>'}<div class="row wrap" style="margin-top:16px">${btn(I('download') + 'Add my part to calendar', 'calendar-plan', p.id, 'subtle')}${btn(I('camera') + 'Keep a memory', 'moment-plan', p.id, 'subtle')}</div><section class="conversation"><h3>The useful little details.</h3><p class="small muted">Questions about meeting up, tickets or timing. Visible to this private trip.</p>${p.comments.map((c) => `<div class="comment">${avatar(c.memberId)}<div class="comment-body"><strong>${E(person(c.memberId).name)}</strong> <small>${when(c.created)} JST</small><p>${E(c.text)}</p>${c.memberId === S.me.id || S.me.role === 'owner' ? `<button class="text-btn" data-action="comment-delete" data-id="${E(c.id)}" data-plan="${E(p.id)}">Remove</button>` : ''}</div></div>`).join('')}<form id="comment-form" data-plan="${E(p.id)}" class="comment-form" style="margin-top:15px"><label for="comment-text" class="screenreader">Ask about this plan</label><textarea id="comment-text" name="text" maxlength="1200" placeholder="A question, a clearer exit, a tiny update…" required></textarea><button class="btn primary" type="submit">Send</button></form><div id="comment-error" class="form-error" role="alert"></div></section>`,
      'plan',
      id,
      true,
    );
  }
  function regionOptions(value) {
    return Object.entries(R)
      .map(
        ([k, v]) =>
          `<option value="${k}" ${value === k ? 'selected' : ''}>${v}</option>`,
      )
      .join('');
  }
  function field(name, label, value = '', type = 'text', extra = '') {
    return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${E(value)}" ${extra}></div>`;
  }
  function segmentMarkup(s, i) {
    return `<section class="segment-edit" data-segment="${E(s.id)}"><div class="row between"><span class="eyebrow">A smaller invitation · ${i + 1}</span><button type="button" class="icon-btn" data-action="remove-segment" data-id="${E(s.id)}" aria-label="Remove meeting option">${I('close')}</button></div><div class="field"><label for="seg-${i}-label">What can friends join?</label><input id="seg-${i}-label" data-seg="label" value="${E(s.label)}" maxlength="100" placeholder="Just lunch / meet after the run" required></div><div class="field-row"><div class="field"><label for="seg-${i}-start">From · JST</label><input id="seg-${i}-start" data-seg="start" type="time" value="${E(s.start)}" required></div><div class="field"><label for="seg-${i}-end">Until · JST</label><input id="seg-${i}-end" data-seg="end" type="time" value="${E(s.end)}" required></div></div><div class="field"><label for="seg-${i}-meeting">Meeting point for this part</label><input id="seg-${i}-meeting" data-seg="meeting" value="${E(s.meeting)}" maxlength="500" required placeholder="An exact exit, landmark or address"></div></section>`;
  }
  function readSegments() {
    return [...dialog.querySelectorAll('[data-segment]')].map((el) => ({
      id: el.dataset.segment,
      ...Object.fromEntries(
        [...el.querySelectorAll('[data-seg]')].map((x) => [
          x.dataset.seg,
          x.value,
        ]),
      ),
    }));
  }
  function planData(form) {
    const d = Object.fromEntries(new FormData(form));
    d.capacity = d.capacity ? Number(d.capacity) : null;
    d.segments = readSegments();
    if (form.dataset.id) d.revision = +form.dataset.revision;
    return d;
  }
  function planDraftKey() {
    return `omakase-plan-draft-${mode}-${S?.me?.id}`;
  }
  function storePlanDraft() {
    const form = dialog.querySelector('#plan-form');
    if (!form || form.dataset.id) return;
    try {
      sessionStorage.setItem(planDraftKey(), JSON.stringify(planData(form)));
    } catch {
      /* Best-effort fallback; canonical server state is unchanged. */
    }
  }
  function openPlanForm(id = '', catalogueId = '') {
    const old = S.plans.find((p) => p.id === id),
      a = BY.get(catalogueId);
    let draft = null;
    if (!old && !a)
      try {
        draft = JSON.parse(sessionStorage.getItem(planDraftKey()));
      } catch {
        /* Best-effort fallback; canonical server state is unchanged. */
      }
    const day =
      a?.start && (ui.day < a.start || ui.day > a.end) ? a.start : ui.day;
    const p = old ||
      draft || {
        title: a?.title || '',
        region: a?.region || (ui.region === 'all' ? 'osaka' : ui.region),
        area: a?.area || '',
        date: day,
        start: '10:00',
        end: '12:00',
        meeting: '',
        description: a
          ? 'A discovery I’m curious about. Opening, access and bookings still need checking.'
          : '',
        mapLink: '',
        cost: '',
        booking: 'check',
        kind: a ? 'idea' : 'going',
        joinStyle: 'open',
        effort: 'easy',
        capacity: null,
        segments: [],
        catalogueId: a?.id || '',
      };
    draftSegments = structuredClone(p.segments || []);
    openModal(
      old ? 'Edit your invitation' : 'Make an open invitation',
      `<h2>${old ? 'Plans change.' : 'I’m doing this.<br><em>Come along?</em>'}</h2><p class="lede">Make the invitation specific, not compulsory. Friends decide which parts work for them. All dates and times are in Japan.</p>${draft && !old ? '<div class="notice">An unsent draft was restored in this tab. <button class="text-btn" data-action="discard-draft">Discard draft</button></div>' : ''}${old ? '<div class="notice warn">Editing asks everyone already joined to review and reconfirm—even when they joined only one part.</div>' : ''}<form id="plan-form" data-id="${E(old?.id || '')}" data-revision="${E(old?.revision || '')}"><input type="hidden" name="catalogueId" value="${E(p.catalogueId)}"><input type="hidden" name="requestId" value="${E(p.requestId || uid())}"><div class="field"><label for="f-title">The invitation</label><input id="f-title" name="title" maxlength="150" required value="${E(p.title)}" placeholder="A river walk, then whatever smells good"></div><div class="field-row"><div class="field"><label for="f-kind">How decided are you?</label><select id="f-kind" name="kind"><option value="going" ${p.kind === 'going' ? 'selected' : ''}>I’m going · company welcome</option><option value="idea" ${p.kind === 'idea' ? 'selected' : ''}>An idea · seeing who’s keen</option></select></div><div class="field"><label for="f-joinStyle">How can friends join?</label><select id="f-joinStyle" name="joinStyle"><option value="open" ${p.joinStyle === 'open' ? 'selected' : ''}>All of it, or a smaller part</option><option value="reunion" ${p.joinStyle === 'reunion' ? 'selected' : ''}>Solo first · meet afterward only</option></select></div></div><div class="field-row"><div class="field"><label for="f-region">Region</label><select id="f-region" name="region">${regionOptions(p.region)}</select></div>${field('area', 'Neighborhood / island', p.area, 'text', 'maxlength="100" required')}</div><div class="field-row three">${field('date', 'Day · Japan', p.date, 'date', `min="${E(S.trip.start)}" max="${E(S.trip.end)}" required`)}${field('start', 'From · JST', p.start, 'time', 'required')}${field('end', 'Until · JST', p.end, 'time', 'required')}</div><div class="field"><label for="f-meeting">The main meeting point</label><textarea id="f-meeting" name="meeting" maxlength="500" required placeholder="A named landmark, station exit or address. Add which side and how to spot you.">${E(p.meeting)}</textarea><small>A vague “meet in Osaka” is not enough. Avoid publishing hotel room numbers or private access codes.</small></div><div class="field"><label for="f-description">The invitation in your words</label><textarea id="f-description" name="description" maxlength="3000" placeholder="The idea, the pace, what is and isn’t arranged. Permission to join just for the coffee.">${E(p.description)}</textarea></div><div class="section-label">Make it easy to join for a little</div><p class="small muted">Add an exact time and place for lunch, coffee, or meeting afterward. All parts must fit inside the invitation’s time window.</p><div id="segment-list">${draftSegments.map(segmentMarkup).join('')}</div>${btn(I('plus') + 'Add a meet-up part', 'add-segment', '', 'subtle')}<details class="form-detail" ${old ? 'open' : ''}><summary>Cost, capacity, effort & booking</summary><div class="field-row">${field('capacity', 'Total places, including you', p.capacity || '', 'number', 'min="2" max="40" placeholder="No fixed limit"')}<div class="field"><label for="f-effort">Physical commitment</label><select id="f-effort" name="effort">${[
        ['easy', 'Easy pace'],
        ['active', 'Active outing'],
        ['demanding', 'Demanding outing'],
      ]
        .map(
          ([k, v]) =>
            `<option value="${k}" ${p.effort === k ? 'selected' : ''}>${v}</option>`,
        )
        .join(
          '',
        )}</select></div></div>${field('cost', 'Expected cost / who pays', p.cost, 'text', 'maxlength="160" placeholder="Not known yet is a valid answer"')}<div class="field"><label for="f-booking">Booking status</label><select id="f-booking" name="booking">${[
        ['check', 'Needs checking / not arranged'],
        ['not-needed', 'No booking needed, according to host'],
        ['host-booked', 'I have booked for myself only'],
      ]
        .map(
          ([k, v]) =>
            `<option value="${k}" ${p.booking === k ? 'selected' : ''}>${v}</option>`,
        )
        .join(
          '',
        )}</select><small>A friend’s RSVP never buys a ticket. Confirm each person’s booking separately.</small></div>${field('mapLink', 'Optional exact map link', p.mapLink, 'url', 'maxlength="2000" placeholder="https://…"')}<p class="small muted">Capacity applies across the whole invitation, not separately to each part. Overnight trips need separate daily invitations.</p></details><div class="notice">${I('people')} Visible to members of this private trip. Nothing is sent to your contacts, calendars or booking sites automatically.</div><div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn subtle" data-action="close">${old ? 'Cancel edit' : 'Keep draft in this tab'}</button><button type="submit" class="btn primary">${old ? 'Save & ask friends to reconfirm' : 'Put the invitation out there'} ${I('arrow')}</button></div></form>`,
      'plan-form',
      id,
      true,
    );
  }
  function showDiscovery(id) {
    const a = BY.get(id);
    if (!a) return;
    const pick = saved(a.id),
      friends = S.picks.filter((p) => p.catalogueId === a.id && p.shared);
    const similar = S.plans.filter(
      (p) => p.catalogueId === id && p.status === 'open',
    );
    openModal(
      `${R[a.region]} / discovery ${E(String(a.n).padStart(3, '0'))}`,
      `<div class="mood-symbol">${I(MOODS[a.mood])}</div><span class="eyebrow">${E(a.area)} · ${E(a.mood)}</span><h2 style="margin-top:13px">${E(a.title)}</h2><p class="lede">${E(a.why)}</p><div class="fact-grid"><div class="fact"><small>On-site estimate</small><strong>~${E(a.minutes)} minutes · travel excluded</strong></div><div class="fact"><small>Scale</small><strong>${a.flags.includes('o') ? 'Separate stay / island base' : a.flags.includes('d') ? 'Regional excursion' : 'Neighborhood / local area'}</strong></div><div class="fact"><small>Before going</small><strong>${a.flags.includes('b') ? 'Book or arrange ahead' : 'Check opening & access'}</strong></div></div>${a.start ? `<div class="notice warn">Listed event window: ${dateText(a.start)}–${dateText(a.end)} 2026. Recheck the organizer before committing.</div>` : ''}<p class="small" style="line-height:1.85">${E(a.practical)}</p>${a.flags.includes('w') ? '<div class="notice warn">Marine / river activity. A reputable operator must confirm access, weather, sea state and your suitability. The app cannot determine whether swimming is safe.</div>' : ''}${a.flags.includes('o') ? `<div class="notice">${a.region === 'okinawa' ? 'Island base: ' + E(a.cluster) + '. ' : 'Regional trip. '}Treat transport and accommodation as separate commitments, not a casual nearby stop.</div>` : ''}<div class="card-actions">${mode === 'shared' ? btn('Check this for my dates ✳', 'ask-check', a.id, 'subtle') : ''}${btn(I('plus') + 'Invite friends to this', 'plan-from', a.id, 'primary')}${btn(I(pick ? 'check' : 'save') + (pick ? 'Saved privately' : 'Save for myself'), 'save-detail', a.id)}${btn(I('people') + (pick?.shared ? 'Stop sharing this pick' : 'Recommend to the group'), 'recommend', a.id, 'subtle')}</div>${friends.length ? `<div class="detail-host">${friends.map((p) => avatar(p.memberId)).join('')}<span>${friends.map((p) => E(person(p.memberId).name)).join(', ')} recommended this</span></div>` : ''}${similar.length ? `<div class="section-label">There’s already an open invitation</div>${similar.map((p) => btn(E(p.title) + ' ' + I('arrow'), 'plan-detail', p.id, 'full')).join('')}` : ''}<div class="source-box"><strong>${a.custom ? 'A friend’s recommendation' : a.checked ? 'Narrow source check · ' + E(a.checked) : 'Research lead · not reverified for your visit'}</strong><p>${E(a.sourceScope || (a.custom ? 'Added by ' + person(a.memberId).name + '. Confirm details with the place before going.' : 'This catalogue preserves earlier research. A regional overview or third-party link is not confirmation of exact venue identity, operation, access or availability.'))}</p><div class="row wrap">${safeURL(a.source) ? `<a class="text-btn" href="${E(safeURL(a.source))}" target="_blank" rel="noopener noreferrer">${a.custom ? 'Open the shared link' : 'Read the research source'} ${I('external')}</a>` : ''}<a class="text-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.mapQuery)}" target="_blank" rel="noopener noreferrer">Search in Maps ${I('pin')}</a></div><p>A map search is not a verified pin or navigation route. Joining a friend does not remove any of these checks.</p></div>`,
      'discovery',
      id,
    );
    if (mode === 'shared')
      void api('/research/' + id)
        .then((r) => {
          if (
            modal?.type !== 'discovery' ||
            modal.id !== id ||
            !r.sources.length
          )
            return;
          dialog
            .querySelector('.dialog-body')
            .insertAdjacentHTML(
              'beforeend',
              `<section class="source-box"><h3>Checked pages for this discovery</h3>${r.sources.map((s) => `<p><a href="${E(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">${E(s.title)}</a> · ${E(s.checkedAt.slice(0, 10))} · ${s.status === 'read' ? 'page read' : 'unavailable'}</p>${(s.quotes || []).map((q) => `<blockquote>${E(q)}</blockquote>`).join('')}`).join('')}<p>Reusable place research, separate from anyone’s availability. Recheck operating details and bookings with the venue.</p></section>`,
            );
        })
        .catch(() => {
          /* Optional research failure never blocks the discovery. */
        });
  }
  function windowMarkup(w, i) {
    return `<section class="segment-edit" data-window><div class="row between"><span class="eyebrow">Travel window ${i + 1}</span><button type="button" class="icon-btn" data-action="remove-window" data-index="${i}" aria-label="Remove travel window">${I('close')}</button></div><div class="field-row"><div class="field"><label for="window-${i}-region">Region</label><select id="window-${i}-region" data-w="region">${regionOptions(w.region)}</select></div><div class="field"><label for="window-${i}-area">Area / island (optional)</label><input id="window-${i}-area" data-w="area" maxlength="100" value="${E(w.area)}" placeholder="Aka / Naha / Kitahama"></div></div><div class="field-row"><div class="field"><label for="window-${i}-from">From</label><input id="window-${i}-from" data-w="from" type="date" value="${E(w.from)}" min="${E(S.trip.start)}" max="${E(S.trip.end)}" required></div><div class="field"><label for="window-${i}-to">Through</label><input id="window-${i}-to" data-w="to" type="date" value="${E(w.to)}" min="${E(S.trip.start)}" max="${E(S.trip.end)}" required></div></div></section>`;
  }
  function readWindows() {
    return [...dialog.querySelectorAll('[data-window]')].map((el) =>
      Object.fromEntries(
        [...el.querySelectorAll('[data-w]')].map((x) => [x.dataset.w, x.value]),
      ),
    );
  }
  function profileModal() {
    const m = S.me;
    windowsDraft = structuredClone(m.profile?.windows || []);
    openModal(
      'Your part of the trip',
      `<h2>Where might we<br><em>cross paths?</em></h2><p class="lede">Share only the areas and dates you want friends to know. No live location, hotel address, or complete itinerary is required.</p><form id="profile-form">${field('name', 'Your display name', m.name, 'text', 'maxlength="50" required')}<div class="field"><label for="f-bio">A little about your pace</label><textarea id="f-bio" name="bio" maxlength="300" placeholder="Early runs, late breakfasts, very happy to split up and meet later.">${E(m.profile?.bio || '')}</textarea></div>${field('interests', 'Things you’re drawn to', m.profile?.interests || '', 'text', 'maxlength="200" placeholder="Food, architecture, water, tiny shops…"')}<div class="section-label">My shared travel windows</div><div id="window-list">${windowsDraft.map(windowMarkup).join('')}</div>${btn(I('plus') + 'Add dates in a region', 'add-window', '', 'subtle')}<div class="notice">Everything entered here is shared with this trip’s members when you save. Leaving a date blank does not tell friends where you are.</div><div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn subtle" data-action="close">Cancel</button><button type="submit" class="btn primary">Save my shared profile ${I('arrow')}</button></div></form>`,
      'profile',
    );
  }
  function openMoment(id = '', planId = '') {
    const m = S.moments.find((m) => m.id === id),
      p = S.plans.find((p) => p.id === planId);
    draftPhotos = [...(m?.photos || [])];
    openModal(
      m ? 'Edit your memory' : 'A little proof you were here',
      `<h2>${m ? 'Keep it in your words.' : 'What did you find?'}</h2><p class="lede">One photo, a sentence, a small disagreement about a snack. It doesn’t have to be impressive to be worth keeping.</p><form id="moment-form" data-request="${uid()}" data-id="${E(m?.id || '')}" data-revision="${E(m?.revision || '')}"><input name="planId" type="hidden" value="${E(m?.planId || p?.id || '')}">${field('title', 'A title, if it needs one', m?.title || '', 'text', 'maxlength="150"')}<div class="field"><label for="memory-text">The memory · your actual words</label><textarea id="memory-text" name="text" maxlength="5000" rows="5" required placeholder="The thing I would never have found on my own…">${E(m?.text || '')}</textarea></div><div class="field-row">${field('date', 'When · Japan', m?.date || p?.date || ui.day, 'date', `min="${E(S.trip.start)}" max="${E(S.trip.end)}" required`)}<div class="field"><label for="memory-region">Region</label><select id="memory-region" name="region">${regionOptions(m?.region || p?.region || (ui.region === 'all' ? 'tokyo' : ui.region))}</select></div></div><div class="field"><label for="memory-photo">Up to three photographs</label><input id="memory-photo" type="file" accept="image/*" multiple><small>Phone photos up to 12 MB. HEIC works only when your browser can decode it; otherwise export as JPEG. ${mode === 'shared' ? 'Images are re-encoded without original metadata and stored on this trip’s server.' : 'The local example stores resized copies only in this browser.'} Keep your original photos elsewhere.</small></div><div id="photo-preview" class="preview-photos">${photoPreviews()}</div>${m?.visibility === 'private' ? `<div class="notice">This older note is still private. Editing does not share it.</div><input type="hidden" name="visibility" value="private">` : `<input type="hidden" name="visibility" value="group"><div class="memory-sharing">${I('people')} Goes into our shared trip book. Everyone in the trip can see it.</div>`}<div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn subtle" data-action="close">Cancel</button><button type="submit" class="btn primary">Save this memory ${I('arrow')}</button></div></form>`,
      'moment-form',
      id,
    );
  }
  function photoPreviews() {
    return draftPhotos
      .map(
        (id, i) =>
          `<figure><img src="${E(photo(id))}" alt="Selected memory photo ${i + 1}"><button type="button" data-action="remove-photo" data-id="${E(id)}" aria-label="Remove photo ${i + 1}">${I('close')}</button></figure>`,
      )
      .join('');
  }
  async function processPhotos(files) {
    const input = dialog.querySelector('#memory-photo');
    const error = dialog.querySelector('.form-error');
    if (!files.length) return;
    if (draftPhotos.length + files.length > 3) {
      error.textContent = 'Choose at most three photographs.';
      return;
    }
    photoBusy = true;
    error.textContent = '';
    const save = dialog.querySelector('[type=submit]');
    if (save) save.disabled = true;
    const session = modal;
    try {
      for (const f of files) {
        if (f.size > 12 * 1024 * 1024)
          throw Error('Choose a photo under 12 MB.');
        let bitmap;
        try {
          bitmap = await createImageBitmap(f);
        } catch {
          throw Error(
            'This browser cannot read that photo. Export it as JPEG and try again.',
          );
        }
        if (bitmap.width * bitmap.height > 40000000) {
          bitmap.close();
          throw Error('Use an image under 40 megapixels.');
        }
        const max = mode === 'demo' ? 900 : 1600,
          scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height)),
          canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
          .getContext('2d')
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        if (modal !== session) return;
        let encoded = canvas.toDataURL('image/jpeg', 0.82);
        if (encoded.length > 1550000)
          encoded = canvas.toDataURL('image/jpeg', 0.6);
        if (encoded.length > 1550000)
          throw Error(
            'That image is still too large after resizing. Pick a smaller copy.',
          );
        const result = await api('/photos', 'POST', { data: encoded });
        if (modal !== session) return;
        draftPhotos.push(result.id);
        dialog.querySelector('#photo-preview').innerHTML = photoPreviews();
      }
      toast(
        mode === 'demo'
          ? 'Photo processed locally.'
          : 'Photo ready. Save the memory to add it to the shared book.',
      );
    } catch (e) {
      if (modal === session) error.textContent = errText(e);
    } finally {
      photoBusy = false;
      if (save?.isConnected) save.disabled = false;
      if (input?.isConnected) input.value = '';
    }
  }
  function showUpdates() {
    openModal(
      'The useful updates',
      `<h2>What changed?</h2><p class="lede">New invitations, changes and answers. This is an in-app inbox; it does not send push notifications, texts or email.</p>${
        S.changes.filter((c) => c.actor !== S.me.id).length
          ? S.changes
              .filter((c) => c.actor !== S.me.id)
              .slice(0, 60)
              .map(
                (c) =>
                  `<div class="update ${c.seq > S.readSeq ? 'new' : ''}">${avatar(c.actor)}<div class="grow"><p><strong>${E(person(c.actor).name)}</strong> ${E(c.summary)}</p><small>${when(c.created)} JST</small>${S.plans.some((p) => p.id === c.entity) ? `<br><button class="text-btn" data-action="plan-detail" data-id="${E(c.entity)}">View invitation ${I('arrow')}</button>` : ''}</div></div>`,
              )
              .join('')
          : empty(
              'You’re up to date.',
              'Relevant updates from friends appear here when the shared trip changes.',
            )
      }<div class="form-actions">${btn('Mark read ' + I('check'), 'read-updates', '', 'primary')}</div>`,
      'updates',
    );
  }
  function drawModal(mood = 'all') {
    openModal(
      'A bounded little surprise',
      `<h2>Leave one thing<br><em>to chance.</em></h2><p class="lede">Choose a region and an exact area first. The draw suggests a research lead—not a safe, open or bookable activity. On-site estimates exclude travel.</p><form id="dice-form"><div class="field-row"><div class="field"><label for="dice-region">Region</label><select id="dice-region">${Object.entries(
        R,
      )
        .filter(([k]) => k !== 'elsewhere')
        .map(
          ([k, v]) =>
            `<option value="${k}" ${(ui.region === 'all' ? 'osaka' : ui.region) === k ? 'selected' : ''}>${v}</option>`,
        )
        .join(
          '',
        )}</select></div><div class="field"><label for="dice-area">Neighborhood / island</label><select id="dice-area"></select></div></div><div class="field-row"><div class="field"><label for="dice-mood">In the mood for</label><select id="dice-mood"><option value="all">Anything local</option>${Object.keys(
        MOODS,
      )
        .map((k) => `<option ${k === mood ? 'selected' : ''}>${k}</option>`)
        .join(
          '',
        )}</select></div><div class="field"><label for="dice-time">Time on site</label><select id="dice-time"><option value="90">Up to 90 minutes</option><option value="180" selected>Up to 3 hours</option><option value="600">Up to a day</option></select></div></div><div class="field"><label class="check-row"><input id="dice-arranged" type="checkbox">Include things that need advance arrangements, a separate stay or a regional excursion.</label></div><div class="field"><label class="check-row"><input id="dice-water" type="checkbox">Include operator-led water activities. I’ll confirm access and conditions independently.</label></div><div class="form-error" role="alert"></div><button type="submit" class="btn primary full">Draw one discovery ${I('dice')}</button></form><div id="dice-result"></div>`,
      'dice',
    );
    updateDiceAreas();
  }
  function updateDiceAreas() {
    const region = dialog.querySelector('#dice-region').value;
    const areas = [
      ...new Set(C.filter((a) => a.region === region).map((a) => a.area)),
    ].sort();
    dialog.querySelector('#dice-area').innerHTML = areas
      .map((a) => `<option ${a === ui.area ? 'selected' : ''}>${E(a)}</option>`)
      .join('');
    const preferred = {
      osaka: 'Nakanoshima & Kitahama',
      tokyo: 'Yanaka & Nezu',
      okinawa: 'Naha',
    }[region];
    if (areas.includes(preferred) && ui.area === 'all')
      dialog.querySelector('#dice-area').value = preferred;
  }
  function drawDiscovery() {
    const q = (id) => dialog.querySelector('#' + id),
      region = q('dice-region').value,
      area = q('dice-area').value,
      mood = q('dice-mood').value,
      minutes = +q('dice-time').value,
      arranged = q('dice-arranged').checked,
      water = q('dice-water').checked;
    const pool = C.filter(
      (a) =>
        a.region === region &&
        a.area === area &&
        (mood === 'all' || a.mood === mood) &&
        a.minutes <= minutes &&
        (arranged || !/[bod]/.test(a.flags)) &&
        (water || !a.flags.includes('w')) &&
        (!a.start || (ui.day >= a.start && ui.day <= a.end)),
    );
    let options = pool.filter((a) => !diceSeen.has(a.id));
    const error = q('dice-form').querySelector('.form-error');
    if (!options.length) {
      error.textContent = pool.length
        ? 'You’ve seen every match in this shortlist. Change a filter or reset the draw; no repeats were slipped in.'
        : 'No matching discoveries. Relax a filter; we will not invent a convenient option.';
      q('dice-result').innerHTML = pool.length
        ? btn('Reset seen discoveries', 'dice-reset', '', 'subtle')
        : '';
      return;
    }
    error.textContent = '';
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const a = options[bytes[0] % options.length];
    diceSeen.add(a.id);
    q('dice-result').innerHTML =
      `<div class="section-label">One possibility · ${pool.length} in this shortlist</div>${discoveryCard(a)}<div class="card-actions">${btn('Read before deciding ' + I('arrow'), 'discovery', a.id)}${btn('Make it an invitation ' + I('plus'), 'plan-from', a.id, 'primary')}</div>`;
  }
  function showChapter(region) {
    const picks = C.filter((a) => a.region === region && a.featured).slice(
        0,
        6,
      ),
      copy = {
        tokyo: [
          'Small streets.<br>Big curiosity.',
          'Let one neighborhood become a whole afternoon. Find the craft, the tiny museum or the unusual object that makes a place personal.',
        ],
        osaka: [
          'Good food.<br>Longer detours.',
          'Follow your curiosity from rivers and older streets to a bowl worth meeting over. Keep the bigger rural excursions separate from the everyday city.',
        ],
        okinawa: [
          'Island time.<br>Your own pace.',
          'Start with the island you will actually be on. Naha, the Keramas, Miyako and the Yaeyamas are not interchangeable nearby stops.',
        ],
      }[region];
    openModal(
      R[region] + ' / the fieldbook',
      `<div class="book-intro"><div><span class="eyebrow">100 possibilities · no required stops</span><h2>${copy[0]}</h2><p>${copy[1]}</p>${btn('Browse this chapter ' + I('arrow'), 'browse-region', region, 'primary')}</div><img src="${E(A[region])}" alt="Imaginative regional illustration, not documentary photography"></div><p class="small muted">The image above is a decorative illustration. Individual discoveries link to their sources and retain their research status.</p><div class="section-label">A few starting points</div><div class="discovery-grid">${picks.map(discoveryCard).join('')}</div><div class="card-actions">${btn('See open invitations here ' + I('arrow'), 'board-region', region, 'subtle')}</div>`,
      'chapter',
      region,
      true,
    );
  }
  async function inviteModal() {
    if (mode === 'demo') {
      liveInfo();
      return;
    }
    openModal(
      'Bring your people',
      `<h2>One link.<br><em>Everyone’s own trip.</em></h2><p class="lede">Drop this in the group chat. Friends choose their name and they’re in. No accounts to set up, no itinerary to agree to.</p><div id="invite-result" class="invite-link-panel"><p>Getting the group link…</p></div><p class="small muted" style="margin-top:20px">Anyone with this link can join. They do not need a Cloudflare account. You can forward it to the friends coming along.</p>${S.me.role === 'owner' ? `<details class="form-detail"><summary>Need a replacement link?</summary><p>Replacing the link stops future joins from the old one. Friends already here stay signed in.</p>${btn('Replace group invitation', 'replace-invite', '', 'subtle')}</details>` : ''}`,
      'invite',
    );
    try {
      const data = await api('/invite'),
        url = location.origin + '/#join=' + data.token;
      const target = dialog.querySelector('#invite-result');
      if (target)
        target.innerHTML = `<label for="invite-url">Our trip invitation</label><input id="invite-url" readonly value="${E(url)}"><div class="row wrap">${btn('Copy link', 'copy-invite', '', 'primary')}${btn('Send to friends ' + I('arrow'), 'share-invite', '', 'subtle')}</div>`;
    } catch (e) {
      const t = dialog.querySelector('#invite-result');
      if (t) t.textContent = errText(e);
    }
  }

  function showRecovery(key) {
    const url = location.origin + '/#device=' + encodeURIComponent(key);
    openModal(
      'Use your other device',
      `<h2>Your plans.<br><em>Another screen.</em></h2><p class="lede">Open this personal link on your other phone or computer to continue as the same person.</p><div class="field"><label for="invite-url">Your personal device link</label><input id="invite-url" readonly value="${E(url)}"></div>${btn('Copy device link', 'copy-invite', '', 'primary')}<p class="small muted" style="margin-top:20px">Use “Invite friends” for the group link. This one opens your own profile.</p>`,
      'device',
    );
  }

  function liveInfo() {
    openModal(
      'From this example to our trip',
      `<h2>One real link.<br><em>All our different days.</em></h2><p class="lede">This downloaded example stays on this device. The Cloudflare version includes the actual shared service: Workers, D1 and R2.</p><div class="notice">The example is not connected to a hosted trip. Fictional people are never added to production.</div><form id="open-server-form">${field('url', 'Already have your trip link?', '', 'url', 'placeholder="https://your-trip.workers.dev/#join=…" required')}<div class="form-error" role="alert"></div><button type="submit" class="btn primary">Open our trip ${I('arrow')}</button></form><div class="source-box"><p>The source package includes the database migration, deployment script, backups and tests. Run <code>npm run cloudflare:setup</code> in your authenticated Cloudflare environment to publish.</p></div>`,
      'live-info',
    );
  }

  function tripWindowForm() {
    openModal(
      'Our trip window',
      `<h2>Leave room for<br><em>everyone’s dates.</em></h2><form id="trip-window-form">${field('name', 'Trip name', S.trip.name, 'text', 'maxlength="100" required')}<div class="field-row">${field('start', 'First day · Japan', S.trip.start, 'date', 'required')}${field('end', 'Last day · Japan', S.trip.end, 'date', 'required')}</div><p class="small muted">Up to a year. Existing plans and memories must remain inside the window. This does not change anyone’s personal travel dates.</p><div class="form-error" role="alert"></div><button type="submit" class="btn primary">Save trip window</button></form>`,
      'trip-window',
    );
  }

  function settingsModal() {
    const removed = (S.trash || []).filter((m) => m.memberId === S.me.id);
    openModal(
      'A few useful things',
      `<h2>Less setup.<br><em>More Japan.</em></h2><section class="settings-row"><h3>My name & travel dates</h3><p>Help friends know where your paths might cross.</p>${btn('Edit my details', 'profile', '', 'subtle')}</section>${S.me.role === 'owner' && mode === 'shared' ? `<section class="settings-row"><h3>Our trip window</h3><p>${dateText(S.trip.start)} — ${dateText(S.trip.end)}. Everyone still chooses their own travel dates.</p>${btn('Edit trip window', 'trip-window', '', 'subtle')}</section>` : ''}<section class="settings-row"><h3>Bring someone along</h3><p>One reusable link for friends. No email or password.</p>${btn('Get the trip link', 'invite', '', 'primary')}</section>${mode === 'shared' ? `<section class="settings-row"><h3>Another device?</h3><p>Continue with the same name, saved ideas and plans.</p>${btn('Make my device link', 'device-link', '', 'subtle')}</section>` : ''}<section class="settings-row"><h3>Bring my original shortlist</h3><p>Import saved ideas from the old fieldbook. Old notes stay in that book; they will not suddenly appear here.</p><label class="btn" for="legacy-import">Import old shortlist</label><input id="legacy-import" type="file" accept="application/json,.json" hidden><p id="import-status" role="status"></p></section><section class="settings-row"><h3>A copy of our plans</h3><p>A readable JSON snapshot of your current view. Photo files are separate; the operator backup saves both.</p>${btn('Download snapshot', 'export', '', 'subtle')}</section>${removed.length ? `<section class="settings-row"><h3>Changed your mind?</h3><p>Restore a memory you removed in the last seven days.</p>${removed.map((m) => `<div class="row between"><span>${E(m.title || 'A memory')}</span>${btn('Restore', 'moment-restore', m.id, 'subtle')}</div>`).join('')}</section>` : ''}${
        S.me.role === 'owner' && mode === 'shared'
          ? `<details class="settings-row"><summary>Occasional owner controls</summary><p>You manage access, not everyone’s day.</p>${S.members
              .filter((m) => m.active && m.id !== S.me.id)
              .map(
                (m) =>
                  `<div class="owner-person"><strong>${E(m.name)}</strong><div class="row wrap">${btn('Help sign in', 'member-device', m.id, 'subtle')}${btn('Remove', 'remove-member', m.id, 'subtle')}</div></div>`,
              )
              .join('')}</details>`
          : ''
      }<details class="settings-row"><summary>Research, connection & artwork</summary><p>The original 300 entries remain research leads with their existing source labels, not live availability. Images are inherited illustrations, not documentary venue photos.</p><p>The app checks for changes about every 20 seconds while visible, and again when you return. It does not run that poll in the background. In-app updates only; there are no push notifications. Joining requires a connection.</p></details><section class="settings-row">${mode === 'demo' ? btn('Reset example trip', 'reset-demo', '', 'subtle') : btn('Sign out on this device', 'logout', '', 'subtle')}</section>`,
      'settings',
    );
  }

  function confirmAction(title, message, label, fn) {
    confirmation = fn;
    openModal(
      title,
      `<h2>${E(title)}</h2><p class="lede">${E(message)}</p><div class="form-actions">${btn('Keep it', 'close', '', 'subtle')}${btn(E(label), 'confirm', '', 'danger')}</div>`,
      'confirm',
    );
  }
  function downloadFile(name, text, type = 'application/json') {
    const blob = new Blob([text], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied. Send it privately.');
    } catch {
      toast(
        'Copy was blocked by this browser. Select the displayed text and copy it manually.',
        true,
      );
    }
  }
  function icsEscape(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }
  function utc(date, time) {
    return new Date(date + 'T' + time + ':00+09:00')
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }
  function fold(line) {
    let lines = [],
      v = '',
      n = 0;
    for (const ch of line) {
      const size = new TextEncoder().encode(ch).length;
      if (n + size > 73) {
        lines.push(v);
        v = ' ' + ch;
        n = 1 + size;
      } else {
        v += ch;
        n += size;
      }
    }
    lines.push(v);
    return lines.join('\r\n');
  }
  function calendarExport(plans, selectedChoice = null) {
    if (!plans.length) {
      toast('No commitments to export on this day.');
      return;
    }
    const stale = plans.find((p) => {
      const r = myR(p);
      return (
        p.status === 'open' &&
        r?.status === 'joined' &&
        (r.acceptedRevision !== p.revision ||
          (r.choice !== 'all' && !p.segments.some((s) => s.id === r.choice)))
      );
    });
    if (stale) {
      showPlan(stale.id);
      toast(
        'Review and reconfirm this changed invitation before exporting your calendar.',
        true,
      );
      return;
    }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Adventure Omakase//Together Apart//EN',
      'CALSCALE:GREGORIAN',
    ];
    for (const p of plans) {
      const r = myR(p),
        choice = selectedChoice || r?.choice || 'all',
        s = p.segments.find((s) => s.id === choice),
        part = s || p;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${E(p.id)}-${choice}@adventure-omakase`,
        `SEQUENCE:${E(p.revision)}`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '')}`,
        `DTSTART:${utc(p.date, part.start)}`,
        `DTEND:${utc(p.date, part.end)}`,
        `SUMMARY:${icsEscape((s ? s.label + ' — ' : '') + p.title)}`,
        `LOCATION:${icsEscape(part.meeting)}`,
        `DESCRIPTION:${icsEscape('Japan time. ' + (p.kind === 'idea' ? 'Tentative idea. ' : '') + 'An RSVP is not a booking. Recheck the app for changes.\n' + p.description)}`,
        `STATUS:${p.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    downloadFile(
      'omakase-' + ui.day + '.ics',
      lines.map(fold).join('\r\n') + '\r\n',
      'text/calendar;charset=utf-8',
    );
    toast('Calendar file prepared. It is a snapshot, not a live subscription.');
  }
  function printStory() {
    openModal(
      'Your return edition',
      `<h2>Made from what happened.</h2><p class="lede">Print a fieldbook of real contributions. No invented stories. Your browser can save the print layout as a PDF.</p><label class="choose-part"><input type="radio" name="print-scope" value="group" checked><span><strong>Our shared story</strong><small>Only memories authors shared with this trip. The default for friends.</small></span></label><label class="choose-part"><input type="radio" name="print-scope" value="mine"><span><strong>My personal notebook</strong><small>Includes your private notes. Keep this edition private.</small></span></label><div class="notice">Authors retain ownership of their photos. A shared memory is visible to other members and may be exported; do not share the group’s book publicly without permission.</div><div class="form-actions">${btn('Prepare the return edition ' + I('book'), 'print-now', '', 'primary')}</div>`,
      'print',
    );
  }
  async function doPrint() {
    const scope = dialog.querySelector('[name=print-scope]:checked').value;
    // A restore may have committed before this tab received its refreshed snapshot.
    if (mode === 'shared') await refresh(false);
    if (!S) return;
    const moments = S.moments
      .filter((m) =>
        scope === 'group' ? m.visibility === 'group' : m.memberId === S.me.id,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!moments.length) {
      toast('There are no memories in this edition yet. Add one first.');
      return;
    }
    const node = document.getElementById('print-edition');
    node.innerHTML = `<div class="print-cover"><div class="eyebrow">Adventure Omakase / the return edition</div><h1>Different days.<br><em>Our stories.</em></h1><p>${E(S.trip.name)}</p><p>${dateText(S.trip.start)} — ${dateText(S.trip.end)}</p><p>${scope === 'group' ? 'Shared contributions · private group edition' : 'Personal notebook · includes private memories'}</p></div>${moments.map((m) => `<article class="print-memory"><div class="eyebrow">${dateText(m.date)} · ${R[m.region]}</div><h3>${E(m.title || 'One thing worth keeping')}</h3><p>${E(m.text)}</p><div class="print-photo-row">${m.photos.map((id) => `<img src="${E(photo(id))}" alt="Contributed memory photo">`).join('')}</div><small>${E(person(m.memberId).name)} · ${m.visibility === 'group' ? 'shared with the trip' : 'private'}</small></article>`).join('')}`;
    await Promise.all(
      [...node.querySelectorAll('img')].map((i) =>
        i.decode().catch(() => {
          /* Best-effort cleanup or optional browser capability. */
        }),
      ),
    );
    closeModal();
    window.print();
  }
  function renderLogin() {
    if (mode === 'demo') {
      acceptState(OmakaseDemo.load());
      return;
    }
    const creating = !!setupKey && setupRequired;
    app.innerHTML = `<div class="tagbar"><span>DIFFERENT PLANS. SAME FRIENDS.</span><span class="tag-second">26 SEP — 14 OCT 2026</span></div><header class="header"><div class="header-inner"><span class="brand"><span class="brand-name">omakase<span class="brand-star">✳</span><small>THE TOGETHER, APART EDITION</small></span></span><button class="text-btn" data-action="try-demo">Explore the example ${I('arrow')}</button></div></header><main id="main" class="signin"><div><div class="eyebrow" style="color:var(--rust);margin-bottom:20px">Japan, slightly off script</div><h1>Your own trip.<br><em>Friends welcome.</em></h1><p class="intro">Share an idea. Join just the coffee. Go somewhere entirely different. Bring back a story.</p><div class="intro-promises"><span>${I('route')}No compulsory itinerary</span><span>${I('people')}No account setup</span></div><div class="join-vignettes"><img src="${E(A.tokyo)}" alt="Decorative Tokyo illustration"><img src="${E(A.osaka)}" alt="Decorative Osaka illustration"><img src="${E(A.okinawa)}" alt="Decorative Okinawa illustration"></div><span class="art-note">Illustrated impressions · not venue photographs</span></div><div class="signin-panel"><div class="eyebrow">${creating ? 'Start the trip' : joinToken ? 'Your friends left the door open' : 'You’re in the right place'}</div><h2>${creating ? 'Make it ours.' : joinToken ? 'What do we<br>call you?' : 'Got the group link?'}</h2><p class="small muted" style="margin-bottom:24px">${creating ? 'Set the name of your trip once. After this, share one link with everyone.' : joinToken ? 'Just the name your friends know. Dates and plans can come later. This device will remember you.' : 'Open the invitation from the group chat. That link brings you into your friends’ trip.'}</p>${creating || joinToken ? `<form id="auth-form" data-kind="${creating ? 'create' : 'join'}">${field('name', 'Your name', '', 'text', 'maxlength="50" required autocomplete="given-name"')}${creating ? field('title', 'Trip name', 'Japan, slightly off script', 'text', 'maxlength="100" required') : ''}<div class="form-error" role="alert"></div><button type="submit" class="btn primary full">${creating ? 'Open our trip' : 'I’m in'} ${I('arrow')}</button></form><p class="server-note">${creating ? 'No example people or pretend bookings are added.' : 'Anyone you forward this link to can participate. Names are not verified identities.'}</p>` : `<div class="notice">Already joined on another device? Use your personal device link, or ask the trip owner to help you sign back in.</div><div class="form-error" role="alert"></div>`}</div></main>`;
  }

  async function init() {
    if (mode === 'demo') {
      acceptState(OmakaseDemo.load(), false);
      const v = location.hash.split('/')[1];
      if (['plans', 'day', 'discover', 'people', 'story'].includes(v))
        ui.view = v;
      render();
      return;
    }
    app.innerHTML =
      '<main class="loading"><span class="eyebrow">Adventure Omakase</span><h2>Finding our trip…</h2><div class="skeleton"></div></main>';
    try {
      const health = await fetch('/api/health').then((r) =>
        r.ok ? r.json() : Promise.reject(Error('Not available')),
      );
      setupRequired = health.setupRequired;
      if (deviceKey) {
        acceptState(await api('/recover', 'POST', { key: deviceKey }), false);
        deviceKey = '';
        history.replaceState(null, '', '#plans');
      } else await refresh(false);
      if (S) {
        joinToken = '';
        setupKey = '';
        const v = location.hash.slice(1);
        if (['plans', 'day', 'discover', 'people', 'story'].includes(v))
          ui.view = v;
        else if (DAYS.includes(todayJP())) ui.view = 'day';
        render();
        connectEvents();
        if (pendingPlan) {
          const id = pendingPlan;
          pendingPlan = '';
          showPlan(id);
        }
        if ('serviceWorker' in navigator)
          navigator.serviceWorker.register('/sw.js').catch(() => {
            /* Best-effort cleanup or optional browser capability. */
          });
      } else renderLogin();
    } catch (e) {
      if (e.status === 401) {
        renderLogin();
        return;
      }
      try {
        const old = JSON.parse(sessionStorage.getItem('omakase-last-view'));
        if (old?.mode === 'shared' && !joinToken && !deviceKey) {
          online = false;
          acceptState(old);
          toast(
            'Offline. This is the last loaded view, not a confirmed live plan.',
            true,
          );
          return;
        }
      } catch {
        /* Best-effort fallback; canonical server state is unchanged. */
      }
      renderLogin();
      const er = document.querySelector('.form-error');
      if (er)
        er.textContent = e.status
          ? errText(e)
          : 'The shared trip is not reachable. No changes have been sent.';
    }
  }

  async function mutate(path, method, d, after) {
    await api(path, method, d);
    await refresh();
    if (after) after();
  }

  function findForm() {
    openModal(
      'Not in the original guide',
      `<h2>You found something.<br><em>Pass it on.</em></h2><p class="lede">A tiny shop, a friend’s restaurant tip, a place you want to come back to. This book is yours to add to.</p><form id="find-form" data-request="${uid()}">${field('title', 'What is it?', '', 'text', 'maxlength="150" required')}<div class="field-row"><div class="field"><label for="find-region">Region</label><select name="region" id="find-region">${regionOptions(ui.region === 'all' ? 'osaka' : ui.region)}</select></div>${field('area', 'Neighborhood or island', '', 'text', 'maxlength="100" required')}</div><div class="field"><label for="find-why">Why should we know?</label><textarea id="find-why" name="why" rows="3" maxlength="2000" required placeholder="What made you stop, or who recommended it?"></textarea></div>${field('source', 'A useful link (optional)', '', 'url', 'placeholder="https://…" maxlength="2000"')}<div class="field-row"><div class="field"><label for="find-category">What kind of find?</label><select id="find-category" name="category"><option value="food">Something to eat</option><option value="culture">A place to explore</option><option value="nature">Outside</option><option value="design">Design & architecture</option><option value="odd">Something strange</option><option value="craft">Make something</option><option value="water">On the water</option></select></div>${field('minutes', 'Rough time on site (minutes)', '60', 'number', 'min="5" max="1440" required')}</div><div class="form-error" role="alert"></div><button type="submit" class="btn primary">Add our find ${I('arrow')}</button></form>`,
      'find',
    );
  }
  async function sharePlan(id) {
    if (mode === 'demo') {
      toast(
        'Example invitations stay on this device. Use the hosted trip to share a real one.',
      );
      return;
    }
    const inv = await api('/invite'),
      p = S.plans.find((p) => p.id === id),
      url = location.origin + '/#join=' + inv.token + '&plan=' + id;
    openModal(
      'Send this invitation',
      `<h2>Company welcome.</h2><p class="lede">${E(p.title)}</p><p>${dateText(p.date)} · ${formatTime(p)} JST</p><div class="field"><label for="invite-url">A link straight to this outing</label><input id="invite-url" value="${E(url)}" readonly></div><div class="row wrap">${btn('Copy invitation', 'copy-invite', '', 'primary')}${btn('Send to the chat', 'share-invite', '', 'subtle')}</div><p class="small muted" style="margin-top:16px">Friends new to the trip enter their name first. Opening the link does not RSVP for them.</p>`,
      'share-plan',
    );
  }
  async function handleClick(e) {
    const el = e.target.closest('[data-action],[data-nav]');
    if (!el) return;
    if (el.disabled) return;
    if (el.dataset.nav) {
      e.preventDefault();
      route(el.dataset.nav);
      return;
    }
    const action = el.dataset.action,
      id = el.dataset.id;
    e.preventDefault();
    try {
      switch (action) {
        case 'close':
          storePlanDraft();
          closeModal();
          break;
        case 'plans-nav':
          route('plans');
          break;
        case 'discover-nav':
          route('discover');
          break;
        case 'people-nav':
          route('people');
          break;
        case 'region':
          ui.region = id;
          ui.area = 'all';
          ui.limit = 24;
          render();
          break;
        case 'chapter':
          showChapter(id);
          break;
        case 'browse-region':
          ui.region = id;
          ui.area = 'all';
          ui.mood = 'all';
          route('discover');
          break;
        case 'board-region':
          ui.region = id;
          ui.boardDay = 'all';
          route('plans');
          break;
        case 'my-invites':
          ui.mine = !ui.mine;
          render();
          break;
        case 'plan-new':
          openPlanForm();
          break;
        case 'plan-edit':
          openPlanForm(id);
          break;
        case 'plan-from':
          openPlanForm('', id);
          break;
        case 'plan-detail':
          showPlan(id);
          break;
        case 'share-plan':
          await sharePlan(id);
          break;
        case 'find-new':
          findForm();
          break;
        case 'device-link': {
          const r = await api('/device-link', 'POST');
          showRecovery(r.key);
          break;
        }
        case 'member-device': {
          const r = await api('/device-link', 'POST', { memberId: id });
          showRecovery(r.key);
          break;
        }
        case 'replace-invite':
          confirmAction(
            'Replace the joining link?',
            'Friends already here stay signed in. Send the replacement link to anyone still arriving.',
            'Replace link',
            async () => {
              await api('/invite/rotate', 'POST');
              await inviteModal();
            },
          );
          break;
        case 'moment-restore':
          await mutate('/moments/' + id + '/restore', 'POST', {}, () => {
            settingsModal();
            toast('That memory is back in the book.');
          });
          break;
        case 'discard-draft':
          try {
            sessionStorage.removeItem(planDraftKey());
          } catch {
            /* Best-effort fallback; canonical server state is unchanged. */
          }
          openPlanForm();
          break;
        case 'add-segment':
          draftSegments = readSegments();
          if (draftSegments.length >= 5) {
            toast(
              'Five meeting options is plenty. Keep this invitation clear.',
            );
            break;
          }
          draftSegments.push({
            id: uid(),
            label: '',
            start: dialog.querySelector('[name=start]').value,
            end: dialog.querySelector('[name=end]').value,
            meeting: '',
          });
          dialog.querySelector('#segment-list').innerHTML = draftSegments
            .map(segmentMarkup)
            .join('');
          storePlanDraft();
          break;
        case 'remove-segment':
          draftSegments = readSegments().filter((s) => s.id !== id);
          dialog.querySelector('#segment-list').innerHTML = draftSegments
            .map(segmentMarkup)
            .join('');
          storePlanDraft();
          break;
        case 'plan-cancel': {
          const p = S.plans.find((p) => p.id === id);
          confirmAction(
            'Cancel this invitation?',
            `Friends will see “cancelled” in their day. The change stays visible; we will not silently remove their meeting point. Existing calendar files do not update automatically.`,
            'Cancel invitation',
            async () => {
              await mutate(
                '/plans/' + id + '/status',
                'POST',
                { status: 'cancelled', revision: p.revision },
                () => {
                  closeModal();
                  toast(
                    'Invitation cancelled. Friends will see the update in-app.',
                  );
                },
              );
            },
          );
          break;
        }
        case 'plan-complete': {
          const p = S.plans.find((p) => p.id === id);
          confirmAction(
            'Mark this plan completed?',
            'This closes joining. It does not invent a memory or assume that every participant attended.',
            'Mark completed',
            async () => {
              await mutate(
                '/plans/' + id + '/status',
                'POST',
                { status: 'completed', revision: p.revision },
                () => {
                  closeModal();
                  toast(
                    'Plan marked completed. Leave a memory when you’re ready.',
                  );
                },
              );
            },
          );
          break;
        }
        case 'discovery':
          showDiscovery(id);
          break;
        case 'save':
        case 'save-detail': {
          const was = saved(id);
          await mutate(
            '/picks',
            'POST',
            { catalogueId: id, remove: !!was },
            () => {
              if (action === 'save-detail') showDiscovery(id);
              toast(
                was
                  ? 'Removed from your saved discoveries.'
                  : 'Saved for yourself. Not shared with friends.',
              );
            },
          );
          break;
        }
        case 'recommend': {
          const current = saved(id);
          await mutate(
            '/picks',
            'POST',
            { catalogueId: id, shared: !current?.shared },
            () => {
              showDiscovery(id);
              toast(
                current?.shared
                  ? 'This pick is private again.'
                  : 'Recommended with your name to the group.',
              );
            },
          );
          break;
        }
        case 'mood':
          ui.mood = id;
          ui.limit = 24;
          render();
          break;
        case 'saved-only':
          ui.saved = !ui.saved;
          ui.limit = 24;
          render();
          break;
        case 'more':
          ui.limit += 24;
          render();
          break;
        case 'clear-filters':
          ui.q = '';
          ui.mood = 'all';
          ui.area = 'all';
          ui.max = 'all';
          ui.region = 'all';
          ui.saved = false;
          ui.limit = 24;
          render();
          break;
        case 'day': {
          ui.day = id;
          render();
          document.querySelector('.date-btn.active')?.scrollIntoView({
            block: 'nearest',
            inline: 'center',
            behavior: 'instant',
          });
          break;
        }
        case 'profile':
          profileModal();
          break;
        case 'add-window':
          windowsDraft = readWindows();
          if (windowsDraft.length >= 12) {
            toast('Up to 12 shared travel windows.');
            break;
          }
          windowsDraft.push({
            region: 'osaka',
            area: '',
            from: ui.day,
            to: ui.day,
          });
          dialog.querySelector('#window-list').innerHTML = windowsDraft
            .map(windowMarkup)
            .join('');
          break;
        case 'remove-window':
          windowsDraft = readWindows();
          windowsDraft.splice(+el.dataset.index, 1);
          dialog.querySelector('#window-list').innerHTML = windowsDraft
            .map(windowMarkup)
            .join('');
          break;
        case 'person-plans': {
          const plans = S.plans.filter(
            (p) => p.hostId === id && p.status === 'open',
          );
          openModal(
            `${person(id).name}’s open invitations`,
            `<h2>Company, when it fits.</h2><p class="lede">${E(person(id).name)}’s current ideas and plans. Nothing here expects you to join.</p><div class="invitation-list">${plans.map(invitation).join('') || empty('Nothing posted yet.', 'Not having open plans does not mean someone is unavailable—or needs you to plan for them.')}</div>`,
            'person',
            id,
            true,
          );
          break;
        }
        case 'moment-new':
          openMoment();
          break;
        case 'moment-edit':
          openMoment(id);
          break;
        case 'moment-plan':
          openMoment('', id);
          break;
        case 'moment-delete':
          confirmAction(
            'Remove this memory?',
            'It will leave the book. You can restore it from Trip settings for seven days.',
            'Remove memory',
            async () => {
              await mutate('/moments/' + id, 'DELETE', {}, () => {
                closeModal();
                toast(
                  'Removed from the book. Undo is available in Trip settings.',
                );
              });
            },
          );
          break;
        case 'remove-photo':
          draftPhotos = draftPhotos.filter((p) => p !== id);
          dialog.querySelector('#photo-preview').innerHTML = photoPreviews();
          break;
        case 'story-filter':
          ui.story = id;
          render();
          break;
        case 'comment-delete': {
          const pid = el.dataset.plan;
          await mutate('/comments/' + id, 'DELETE', {}, () => showPlan(pid));
          break;
        }
        case 'ask-find':
          companion.open();
          break;
        case 'ask-check':
          companion.open({ mode: 'check', discoveryId: id });
          break;
        case 'ask-replan':
          companion.open({
            mode: 'find',
            referencePlanId: id,
            reviseExisting: true,
            prompt:
              'Help me rethink this outing. Suggest alternatives within the same window, preserving separate activity and lunch parts. I will review before updating it.',
          });
          break;
        case 'ask-plan':
          companion.open({ mode: 'check', referencePlanId: id });
          break;
        case 'trip-window':
          tripWindowForm();
          break;
        case 'updates':
          showUpdates();
          break;
        case 'read-updates':
          await mutate('/read', 'POST', { seq: S.seq }, () => {
            closeModal();
            toast('Marked read.');
          });
          break;
        case 'dice':
          drawModal();
          break;
        case 'envelope':
          drawModal(id);
          break;
        case 'dice-reset':
          diceSeen.clear();
          drawDiscovery();
          break;
        case 'calendar-day':
          calendarExport(S.plans.filter((p) => p.date === ui.day && myPlan(p)));
          break;
        case 'calendar-plan': {
          const choice = dialog.querySelector('[name=choice]:checked')?.value;
          calendarExport([S.plans.find((p) => p.id === id)], choice);
          break;
        }
        case 'print-story':
          printStory();
          break;
        case 'print-now':
          await doPrint();
          break;
        case 'live-info':
          liveInfo();
          break;
        case 'settings':
          settingsModal();
          break;
        case 'invite':
          inviteModal();
          break;
        case 'copy-invite':
          copy(dialog.querySelector('#invite-url').value);
          break;
        case 'share-invite': {
          const text = dialog.querySelector('#invite-url').value;
          if (navigator.share) {
            try {
              await navigator.share({
                title: S.trip.name,
                text: 'Come along for the parts you like. Join our Japan trip:',
                url: text,
              });
            } catch (e) {
              if (e.name !== 'AbortError')
                toast(
                  'Share sheet unavailable. Copy the displayed link instead.',
                  true,
                );
            }
          } else copy(text);
          break;
        }
        case 'logout':
          confirmAction(
            'Sign out on this device?',
            'Use a personal device link to continue as the same person later. Unsent drafts in this tab will be cleared.',
            'Sign out',
            async () => {
              await api('/logout', 'POST');
              stream?.close();
              S = null;
              try {
                sessionStorage.removeItem('omakase-last-view');
                for (const k of Object.keys(sessionStorage))
                  if (k.startsWith('omakase-plan-draft'))
                    sessionStorage.removeItem(k);
              } catch {
                /* Best-effort fallback; canonical server state is unchanged. */
              }
              closeModal();
              renderLogin();
            },
          );
          break;
        case 'remove-member': {
          const name = person(id).name;
          confirmAction(
            `Remove ${name}?`,
            'They will be signed out on their devices. Their open invitations are cancelled. Their contributions remain attributed to them.',
            'Remove member',
            async () => {
              await mutate('/members/' + id, 'DELETE', {}, () => {
                closeModal();
                toast('Membership removed.');
              });
            },
          );
          break;
        }
        case 'export': {
          const value = await api('/export');
          downloadFile(
            'omakase-private-snapshot.json',
            JSON.stringify(value, null, 2),
          );
          toast('Private snapshot prepared. Keep it off public links.');
          break;
        }
        case 'reset-demo':
          confirmAction(
            'Reset the fictional example?',
            'This deletes changes and memories made in the local example. It never touches a hosted trip. Export anything you wish to retain first.',
            'Reset example',
            () => {
              acceptState(OmakaseDemo.reset(), false);
              closeModal();
              ui.view = 'plans';
              render();
            },
          );
          break;
        case 'confirm': {
          const f = confirmation;
          confirmation = null;
          if (f) await f();
          break;
        }
        case 'legacy':
          openModal(
            'The Japan fieldbook',
            `<h2>Three chapters.<br><em>Your own way through.</em></h2><p class="lede">All 300 original discoveries live in this shared app. Browse a region, save privately, or invite friends to a find.</p><div class="row wrap">${Object.entries(
              R,
            )
              .filter(([key]) => key !== 'elsewhere')
              .map(([key, label]) => btn(E(label), 'chapter', key, 'primary'))
              .join(
                '',
              )}</div><p class="small muted">Have an older local book? Keep its original file and export before changing anything. Trip settings imports saved discoveries only; older private journals and calendars remain in that original file.</p>`,
            'fieldbook',
          );
          break;
        case 'legacy-download':
          downloadFile(
            'Adventure_Omakase_Original_Fieldbook.html',
            window.OMAKASE.legacy,
            'text/html',
          );
          break;
        case 'try-demo':
          location.assign('/example.html#demo/plans');
          break;
        case 'auth-recover':
          joinToken = '';
          history.replaceState(null, '', '#recover');
          renderLogin();
          break;
        case 'auth-create':
          joinToken = '';
          history.replaceState(null, '', '#create');
          renderLogin('create');
          break;
        case 'reconnect':
          online = true;
          try {
            await refresh();
            connectEvents();
            toast('Back in sync. Recheck changed plans before joining.');
          } catch {
            toast(
              'Still cannot reach your trip. No offline commitment was sent.',
              true,
            );
          }
          break;
      }
    } catch (e) {
      toast(errText(e), true);
    }
  }
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    e.preventDefault();
    if (form.id === 'dice-form') {
      drawDiscovery();
      return;
    }
    if (form.id === 'open-server-form') {
      const url = safeURL(new FormData(form).get('url'));
      if (!url) {
        form.querySelector('.form-error').textContent =
          'Use a full http or https app address.';
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (busy) return;
    busy = true;
    const buttons = [...form.querySelectorAll('[type=submit]')];
    buttons.forEach((b) => (b.disabled = true));
    const error =
      form.querySelector('.form-error') ||
      dialog.querySelector('#comment-error');
    if (error) error.textContent = '';
    try {
      const d = Object.fromEntries(new FormData(form));
      if (form.id === 'auth-form') {
        online = true;
        const kind = form.dataset.kind;
        const response = await api(
          kind === 'create' ? '/trips' : '/join',
          'POST',
          kind === 'join'
            ? { ...d, token: joinToken }
            : { ...d, hostKey: setupKey },
        );
        mode = 'shared';
        joinToken = '';
        setupKey = '';
        setupRequired = false;
        ui.view = 'plans';
        history.replaceState(null, '', '#plans');
        acceptState(response);
        connectEvents();
        if ('serviceWorker' in navigator)
          navigator.serviceWorker.register('/sw.js').catch(() => {
            /* Best-effort cleanup or optional browser capability. */
          });
        if (pendingPlan) {
          const id = pendingPlan;
          pendingPlan = '';
          showPlan(id);
        }
        toast('You’re in. Go your own way, or come along.');
      } else if (form.id === 'find-form') {
        const result = await api('/discoveries', 'POST', {
          ...d,
          minutes: +d.minutes,
          requestId: form.dataset.request,
        });
        await refresh();
        closeModal();
        route('discover');
        showDiscovery(result.id);
        toast('Your find is in the group’s book.');
      } else if (form.id === 'plan-form') {
        const payload = planData(form),
          id = form.dataset.id;
        const result = await api(
          id ? '/plans/' + id : '/plans',
          id ? 'PUT' : 'POST',
          payload,
        );
        if (!id)
          try {
            sessionStorage.removeItem(planDraftKey());
          } catch {
            /* Best-effort fallback; canonical server state is unchanged. */
          }
        await refresh();
        showPlan(result.id);
        toast(
          id
            ? 'Updated. Joined friends will be asked to reconfirm.'
            : 'Your invitation is open. Friends can join any available part.',
        );
      } else if (form.id === 'rsvp-form') {
        const status = e.submitter?.value || 'joined';
        const payload = {
          ...d,
          status,
          revision: +form.dataset.revision,
          acknowledgeConflict:
            form.querySelector('#accept-overlap')?.checked === true,
        };
        await mutate(
          '/plans/' + form.dataset.plan + '/rsvp',
          'POST',
          payload,
          () => showPlan(form.dataset.plan),
        );
        toast(
          status === 'joined'
            ? 'Your chosen part is confirmed in the trip. Tickets are separate.'
            : status === 'leave'
              ? 'You left the plan. No explanation needed.'
              : status === 'waitlist'
                ? 'On the waitlist. You have not claimed a place.'
                : 'Interested, without a commitment.',
        );
      } else if (form.id === 'comment-form') {
        await mutate(
          '/plans/' + form.dataset.plan + '/comments',
          'POST',
          {
            text: d.text,
            requestId: form.dataset.request || (form.dataset.request = uid()),
          },
          () => showPlan(form.dataset.plan),
        );
        toast('Message shared on this invitation.');
      } else if (form.id === 'trip-window-form') {
        await mutate(
          '/trip',
          'PUT',
          { ...d, expectedStart: S.trip.start, expectedEnd: S.trip.end },
          () => {
            closeModal();
            toast('Trip window saved. Personal travel dates are unchanged.');
          },
        );
      } else if (form.id === 'profile-form') {
        await mutate(
          '/profile',
          'PUT',
          { ...d, windows: readWindows() },
          () => {
            closeModal();
            toast('Your chosen travel windows are shared with friends.');
          },
        );
      } else if (form.id === 'moment-form') {
        if (photoBusy)
          throw Error('Wait for your photos to finish processing.');
        const payload = {
          ...d,
          requestId: form.dataset.request,
          photos: draftPhotos,
          ...(form.dataset.id ? { revision: +form.dataset.revision } : {}),
        };
        await api(
          form.dataset.id ? '/moments/' + form.dataset.id : '/moments',
          form.dataset.id ? 'PUT' : 'POST',
          payload,
        );
        await refresh();
        closeModal();
        ui.story = payload.visibility === 'group' ? 'group' : 'mine';
        route('story');
        toast(
          payload.visibility === 'group'
            ? 'Added to your group’s real story.'
            : 'Kept in your private notebook.',
        );
      }
    } catch (err) {
      if (error?.isConnected) error.textContent = errText(err);
      else toast(errText(err), true);
      if (form.id === 'rsvp-form' && err.detail?.code === 'overlap') {
        const root = form.querySelector('#overlap-choice');
        root.innerHTML = `<div class="notice warn">${E(err.detail.plans.join(' / '))}</div><label class="check-row"><input id="accept-overlap" type="checkbox">I understand the overlap and still want to join this part.</label>`;
      }
      if (form.id === 'plan-form') storePlanDraft();
    } finally {
      busy = false;
      buttons.forEach((b) => {
        if (b.isConnected) b.disabled = false;
      });
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'search') {
      ui.q = e.target.value;
      ui.limit = 24;
      const pos = e.target.selectionStart;
      render();
      const input = document.getElementById('search');
      input.focus();
      try {
        input.setSelectionRange(pos, pos);
      } catch {
        /* Best-effort fallback; canonical server state is unchanged. */
      }
    }
    if (e.target.closest('#plan-form')) storePlanDraft();
  });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    switch (el.id) {
      case 'demo-person':
        acceptState(OmakaseDemo.switchTo(el.value), false);
        closeModal();
        render();
        toast('Fictional perspective changed. This is still a local example.');
        break;
      case 'board-day':
        ui.boardDay = el.value;
        render();
        break;
      case 'area-filter':
        ui.area = el.value;
        ui.limit = 24;
        render();
        break;
      case 'time-filter':
        ui.max = el.value;
        ui.limit = 24;
        render();
        break;
      case 'dice-region':
        updateDiceAreas();
        break;
      case 'memory-photo':
        await processPhotos([...el.files]);
        break;
      case 'legacy-import': {
        const status = dialog.querySelector('#import-status');
        const file = el.files[0];
        if (!file) break;
        try {
          if (file.size > 6 * 1024 * 1024)
            throw Error('Use a backup up to 6 MB.');
          const backup = JSON.parse(await file.text());
          const r = await api('/import-legacy', 'POST', { backup });
          await refresh();
          status.textContent = r.alreadyImported
            ? 'This exact backup was already imported. Nothing was resurrected.'
            : `${r.imported} saved discoveries imported privately. Old notes and plans were not shared.`;
        } catch (err) {
          status.textContent = 'Not imported: ' + errText(err);
        }
        break;
      }
    }
    if (el.closest('#plan-form')) storePlanDraft();
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    storePlanDraft();
    closeModal();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      ) {
        storePlanDraft();
        closeModal();
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      !dialog.open &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
    ) {
      e.preventDefault();
      route('discover');
      document.getElementById('search')?.focus();
    }
  });
  window.addEventListener('online', async () => {
    if (mode === 'shared' && S) {
      online = true;
      try {
        await refresh();
        connectEvents();
        toast('Reconnected. Check your updated plans.');
      } catch {
        online = false;
      }
    }
  });
  window.addEventListener('offline', () => {
    if (mode === 'shared') {
      online = false;
      if (S) render();
    }
  });
  window.addEventListener('beforeunload', () => stream?.close());
  window.OmakaseTravel({
    getState: () => S,
    getMode: () => mode,
    escape: E,
    openModal,
    release: CLIENT_RELEASE,
    toast,
    openAsk: (options) => companion.open(options),
    openMemory: (draft) => {
      openMoment();
      dialog.querySelector('#memory-text').value = draft.text;
      dialog.querySelector('#f-title').value = draft.title;
    },
  });
  const companion = window.OmakaseAsk({
    getState: () => S,
    getMode: () => mode,
    getDay: () => ui.day,
    escape: E,
    openModal,
    refresh,
    showPlan,
    release: CLIENT_RELEASE,
    toast,
  });
  init();
})();
