'use strict';
// A physical presentation of a catalogue draw. Eligibility and randomness live in app.js.
window.OmakaseDice = (() => {
  let active,
    soundEnabled = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function destroy() {
    active?.dispose();
    active = null;
  }
  function mount(root, roll) {
    destroy();
    const stage = root.querySelector('.dice-atlas'),
      target = root.querySelector('.dice-table'),
      body = root.querySelector('.dice-body'),
      cube = root.querySelector('.dice-cube'),
      shadow = root.querySelector('.dice-shadow'),
      portals = root.querySelector('.chance-portals'),
      destination = root.querySelector('.chance-destination'),
      copy = root.querySelector('.chance-motion-copy'),
      reference = root.querySelector('.chance-reference'),
      soundControl = root.querySelector('.chance-sound'),
      abort = new AbortController();
    let cancelled = false,
      frame,
      finish,
      gesture,
      audio,
      draggedUntil = 0;
    let x = 0,
      y = 0,
      rx = -24,
      ry = 32;
    const bounds = () => ({
      x: Math.max(20, stage.clientWidth / 2 - 85),
      y: Math.max(20, stage.clientHeight / 2 - 85),
    });
    function paint(height = 0, scale = 1) {
      body.style.transform = `translate3d(${x}px,${y - height}px,0) scale(${scale})`;
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      shadow.style.transform = `translate(${x}px,${y}px) scale(${1 - Math.min(height, 120) / 220})`;
      shadow.style.opacity = String(0.22 - Math.min(height, 120) / 800);
    }
    function soundLabel() {
      soundControl.textContent = soundEnabled ? 'Sound on' : 'Sound off';
      soundControl.setAttribute('aria-pressed', String(soundEnabled));
    }
    function enableAudio() {
      if (!soundEnabled) return;
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        audio ||= Context ? new Context() : null;
        audio?.resume()?.catch(() => undefined);
      } catch {
        soundEnabled = false;
        soundLabel();
      }
    }
    function knock(strength = 1) {
      if (!soundEnabled || !audio || audio.state !== 'running') return;
      const length = Math.floor(audio.sampleRate * 0.07),
        buffer = audio.createBuffer(1, length, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.12));
      const source = audio.createBufferSource(),
        filter = audio.createBiquadFilter(),
        gain = audio.createGain();
      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = 900 + strength * 700;
      gain.gain.value = 0.16 * strength;
      source.connect(filter).connect(gain).connect(audio.destination);
      source.start();
    }
    function photo(node, visual) {
      node.replaceChildren();
      if (!visual?.photo?.path?.startsWith('/assets/discovery/photos/')) return;
      const img = document.createElement('img');
      img.src = visual.photo.path;
      img.alt = '';
      img.width = 960;
      img.height = 640;
      img.addEventListener(
        'error',
        () => {
          img.hidden = true;
        },
        { once: true },
      );
      node.append(img);
    }
    function scope(picks) {
      if (cancelled) return;
      stage.dataset.phase = 'ready';
      copy.textContent = '';
      reference.textContent = '';
      x = y = 0;
      rx = -24;
      ry = 32;
      paint();
      const seen = new Set();
      portals.replaceChildren();
      const credits = root.querySelector('.chance-credits div');
      credits.replaceChildren();
      root.querySelector('.chance-credits').open = false;
      for (const pick of picks) {
        const path = pick.visual?.photo?.path;
        if (!path || seen.has(path)) continue;
        seen.add(path);
        const card = document.createElement('figure');
        card.className = 'chance-portal';
        photo(card, pick.visual);
        const label = document.createElement('figcaption');
        label.textContent = pick.visual.reference
          ? `Around ${pick.area}`
          : pick.title;
        card.append(label);
        portals.append(card);
        const credit = document.createElement('p'),
          source = document.createElement('a'),
          license = document.createElement('a');
        source.textContent = pick.visual.photo.author;
        source.href = pick.visual.photo.source;
        license.textContent = pick.visual.photo.license;
        license.href = pick.visual.photo.licenseUrl;
        for (const link of [source, license]) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        credit.append(
          `${pick.visual.photo.caption} · `,
          source,
          ' · ',
          license,
        );
        credits.append(credit);
        if (seen.size === 4) break;
      }
      destination.replaceChildren();
      root.querySelector('.chance-credits').hidden = !seen.size;
      soundLabel();
    }
    target.addEventListener(
      'pointerdown',
      (event) => {
        if (
          target.disabled ||
          (event.pointerType === 'mouse' && event.button !== 0)
        )
          return;
        enableAudio();
        gesture = {
          id: event.pointerId,
          sx: event.clientX,
          sy: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          time: performance.now(),
          vx: 0,
          vy: 0,
          moved: false,
        };
        target.setPointerCapture(event.pointerId);
        stage.dataset.phase = 'held';
        target.classList.add('grabbing');
        if (!reduced()) paint(26, 1.06);
      },
      { signal: abort.signal },
    );
    target.addEventListener(
      'pointermove',
      (event) => {
        if (!gesture || gesture.id !== event.pointerId) return;
        const now = performance.now(),
          dt = Math.max(8, now - gesture.time),
          limits = bounds();
        gesture.vx = clamp(
          ((event.clientX - gesture.lastX) / dt) * 1000,
          -1800,
          1800,
        );
        gesture.vy = clamp(
          ((event.clientY - gesture.lastY) / dt) * 1000,
          -1800,
          1800,
        );
        x = clamp(event.clientX - gesture.sx, -limits.x, limits.x);
        y = clamp(event.clientY - gesture.sy, -limits.y, limits.y);
        gesture.moved ||= Math.hypot(x, y) > 7;
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
        gesture.time = now;
        if (!reduced()) {
          rx = -24 - y * 0.5;
          ry = 32 + x * 0.5;
          paint(26, 1.06);
        }
      },
      { signal: abort.signal },
    );
    function release(event) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const g = gesture;
      gesture = null;
      target.classList.remove('grabbing');
      if (target.hasPointerCapture(event.pointerId))
        target.releasePointerCapture(event.pointerId);
      stage.dataset.phase = 'ready';
      if (event.type === 'pointercancel' || !g.moved) {
        x = y = 0;
        paint();
        return;
      }
      draggedUntil = performance.now() + 500;
      event.preventDefault();
      void roll({ vx: g.vx, vy: g.vy });
    }
    target.addEventListener('pointerup', release, { signal: abort.signal });
    target.addEventListener('pointercancel', release, { signal: abort.signal });
    target.addEventListener(
      'click',
      (event) => {
        if (performance.now() < draggedUntil) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { signal: abort.signal },
    );
    async function frames(duration, tick) {
      if (cancelled || reduced() || document.hidden) return;
      await new Promise((resolve) => {
        finish = resolve;
        const start = performance.now();
        let previous = start;
        const step = (now) => {
          if (cancelled || reduced() || document.hidden) {
            finish = null;
            resolve();
            return;
          }
          const elapsed = now - start,
            dt = Math.min((now - previous) / 1000, 0.032);
          previous = now;
          tick(Math.min(1, elapsed / duration), dt);
          if (elapsed < duration) frame = requestAnimationFrame(step);
          else {
            finish = null;
            resolve();
          }
        };
        frame = requestAnimationFrame(step);
      });
    }
    async function animate(pick, impulse, face = 0) {
      enableAudio();
      root.querySelector('.chance-credits').open = false;
      stage.dataset.phase = 'rolling';
      copy.textContent = 'A small detour is taking shape.';
      photo(destination, pick.visual);
      reference.textContent = pick.visual?.reference
        ? `Around ${pick.area} · neighbourhood reference, not this venue`
        : '';
      let vx = impulse?.vx || 560,
        vy = impulse?.vy || -120,
        height = 40,
        vz = 430;
      let lastKnock = 0;
      await frames(1250, (t, dt) => {
        const limits = bounds();
        x += vx * dt;
        y += vy * dt;
        height += vz * dt;
        vz -= 2000 * dt;
        if (Math.abs(x) > limits.x) {
          x = clamp(x, -limits.x, limits.x);
          vx *= -0.65;
          knock(0.5);
        }
        if (Math.abs(y) > limits.y) {
          y = clamp(y, -limits.y, limits.y);
          vy *= -0.65;
        }
        if (height < 0) {
          height = 0;
          vz = Math.abs(vz) > 80 ? -vz * 0.48 : 0;
          vx *= 0.76;
          vy *= 0.76;
          if (t - lastKnock > 0.09 && t < 0.85) {
            knock(1 - t * 0.8);
            lastKnock = t;
          }
        }
        const drag = Math.exp(-1.3 * dt);
        vx *= drag;
        vy *= drag;
        rx += (vy * 0.9 + vz * 0.65) * dt;
        ry += vx * 1.6 * dt;
        paint(height);
      });
      if (cancelled) return;
      const start = { x, y, rx, ry };
      const [ax, ay] = [
        [-24, 32],
        [-24, -58],
        [-114, 32],
        [66, 32],
        [-24, 122],
        [-24, 212],
      ][face];
      const endX = ax + Math.round((rx - ax) / 360) * 360,
        endY = ay + Math.round((ry - ay) / 360) * 360;
      await frames(280, (t) => {
        const k = 1 - Math.pow(1 - t, 4);
        x = start.x * (1 - k);
        y = start.y * (1 - k);
        rx = start.rx + (endX - start.rx) * k;
        ry = start.ry + (endY - start.ry) * k;
        paint();
      });
      if (cancelled) return;
      x = y = 0;
      rx = endX;
      ry = endY;
      paint();
      stage.dataset.phase = 'travelling';
      copy.textContent = `There you are. ${pick.area}.`;
      await frames(720, () => undefined);
      if (cancelled) return;
      stage.dataset.phase = 'landed';
      copy.textContent = '';
    }
    // Backgrounding must not strand a pending draw on a paused animation frame.
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && finish) {
          cancelAnimationFrame(frame);
          const done = finish;
          finish = null;
          done();
        }
      },
      { signal: abort.signal },
    );
    soundLabel();
    active = {
      scope,
      animate,
      sound() {
        soundEnabled = !soundEnabled;
        enableAudio();
        soundLabel();
        if (soundEnabled) knock(0.5);
      },
      dispose() {
        cancelled = true;
        abort.abort();
        cancelAnimationFrame(frame);
        finish?.();
        finish = null;
        if (audio) void audio.close().catch(() => undefined);
        audio = null;
      },
    };
    return active;
  }
  return { mount, destroy };
})();
