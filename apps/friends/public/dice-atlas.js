'use strict';
// Presentation only: the existing catalogue draw owns eligibility and randomness.
window.OmakaseDice = (() => {
  let active;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function destroy() {
    active?.dispose();
    active = null;
  }
  function mount(root, roll, options = {}) {
    destroy();
    const stage = root.querySelector('.dice-atlas');
    const target = root.querySelector('.dice-table');
    const body = root.querySelector('.dice-body');
    const cube = root.querySelector('.dice-cube');
    const shadow = root.querySelector('.dice-shadow');
    const caption = root.querySelector('.dice-map-caption');
    const mapNode = root.querySelector('#dice-map');
    const abort = new AbortController();
    let map,
      marker,
      frame,
      finishFrame,
      gesture,
      cancelled = false;
    let x = 0,
      y = 0,
      rx = -18,
      ry = 18,
      draggedUntil = 0;
    const limits = () => ({
      x: Math.max(0, stage.clientWidth / 2 - 62),
      y: Math.max(0, stage.clientHeight / 2 - 85),
    });
    function paint(height = 0) {
      body.style.transform = `translate3d(${x}px,${y - height}px,0)`;
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      shadow.style.transform = `translate(${x}px,${y}px) scale(${1 - Math.min(height, 90) / 180})`;
      shadow.style.opacity = String(0.3 - Math.min(height, 90) / 500);
    }
    if (window.L && !options.noMap) {
      const L = window.L;
      map = L.map(mapNode, {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        minZoom: 4,
        maxZoom: 14,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 16,
        keepBuffer: 0,
        updateWhenIdle: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      })
        .on('tileerror', () => {
          if (!cancelled)
            root.querySelector('.dice-map-note').textContent =
              'Map tiles unavailable. Your draw still works; open the result for directions.';
        })
        .addTo(map);
      map.setView([35, 135.5], 5);
    } else if (!options.noMap)
      root.querySelector('.dice-map-note').textContent =
        'Map unavailable. Your draw still works; open the result for directions.';
    const points = () => window.OMAKASE.areas || [];
    const find = (region, area) =>
      points().find((p) => p.region === region && p.area === area);
    function scope(region, area) {
      if (cancelled) return;
      stage.classList.remove('has-landed');
      stage.dataset.phase = 'ready';
      if (marker) {
        marker.remove();
        marker = null;
      }
      x = y = 0;
      rx = -18;
      ry = 18;
      paint();
      caption.textContent =
        area === 'all'
          ? 'Let chance find your corner of Japan.'
          : `A detour around ${area}`;
      const p = find(region, area);
      if (map) {
        map.stop();
        if (p) map.setView([p.lat, p.lng], 10, { animate: false });
        else {
          const rows = points().filter((a) => a.region === region);
          if (rows.length)
            map.fitBounds(
              rows.map((a) => [a.lat, a.lng]),
              { padding: [30, 30], maxZoom: 8, animate: false },
            );
        }
      }
    }
    target.addEventListener(
      'pointerdown',
      (event) => {
        if (
          target.disabled ||
          (event.pointerType === 'mouse' && event.button !== 0)
        )
          return;
        gesture = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          time: performance.now(),
          vx: 0,
          vy: 0,
          moved: false,
        };
        target.setPointerCapture(event.pointerId);
        target.classList.add('grabbing');
      },
      { signal: abort.signal },
    );
    target.addEventListener(
      'pointermove',
      (event) => {
        if (!gesture || gesture.id !== event.pointerId) return;
        const now = performance.now(),
          dt = Math.max(8, now - gesture.time),
          bounds = limits();
        gesture.vx = clamp(
          ((event.clientX - gesture.lastX) / dt) * 1000,
          -1600,
          1600,
        );
        gesture.vy = clamp(
          ((event.clientY - gesture.lastY) / dt) * 1000,
          -1600,
          1600,
        );
        x = clamp(event.clientX - gesture.startX, -bounds.x, bounds.x);
        y = clamp(event.clientY - gesture.startY, -bounds.y, bounds.y);
        gesture.moved ||= Math.hypot(x, y) > 7;
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
        gesture.time = now;
        rx = -18 - y * 0.65;
        ry = 18 + x * 0.65;
        paint(reduced() ? 0 : 22);
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
    async function animate(pick, impulse, face = 0) {
      stage.dataset.phase = 'rolling';
      stage.classList.remove('has-landed');
      if (marker) {
        marker.remove();
        marker = null;
      }
      caption.textContent = 'A little momentum. A new detour.';
      if (!reduced())
        await new Promise((resolve) => {
          finishFrame = resolve;
          let vx = impulse?.vx || 620,
            vy = impulse?.vy || -170;
          let height = 50,
            vz = 340,
            previous = performance.now(),
            elapsed = 0;
          const step = (now) => {
            if (cancelled) return resolve();
            const dt = Math.min((now - previous) / 1000, 0.032);
            previous = now;
            elapsed += dt;
            const bounds = limits();
            x += vx * dt;
            y += vy * dt;
            height += vz * dt;
            vz -= 1900 * dt;
            if (Math.abs(x) > bounds.x) {
              x = clamp(x, -bounds.x, bounds.x);
              vx *= -0.62;
            }
            if (Math.abs(y) > bounds.y) {
              y = clamp(y, -bounds.y, bounds.y);
              vy *= -0.62;
            }
            if (height < 0) {
              height = 0;
              vz = Math.abs(vz) > 75 ? -vz * 0.43 : 0;
              vx *= 0.74;
              vy *= 0.74;
            }
            const drag = Math.exp(-1.35 * dt);
            vx *= drag;
            vy *= drag;
            rx += (vy * 0.8 + vz * 0.28) * dt;
            ry += vx * 0.95 * dt;
            paint(height);
            if (elapsed < 1.45 && !reduced())
              frame = requestAnimationFrame(step);
            else {
              finishFrame = null;
              resolve();
            }
          };
          frame = requestAnimationFrame(step);
        });
      if (cancelled) return;
      const previousBody = body.style.transform;
      const previousCube = cube.style.transform;
      const [finishX, finishY] = [
        [-18, 18],
        [-18, -72],
        [-108, 18],
        [72, 18],
        [-18, 108],
        [-18, 198],
      ][face];
      rx = finishX + Math.round((rx - finishX) / 360) * 360;
      ry = finishY + Math.round((ry - finishY) / 360) * 360;
      x = y = 0;
      paint();
      if (!reduced()) {
        const settling = [
          body.animate(
            [{ transform: previousBody }, { transform: body.style.transform }],
            { duration: 220, easing: 'ease-out' },
          ),
          cube.animate(
            [{ transform: previousCube }, { transform: cube.style.transform }],
            { duration: 220, easing: 'ease-out' },
          ),
        ];
        await Promise.all(
          settling.map((animation) =>
            animation.finished.catch(() => undefined),
          ),
        );
        if (cancelled) return;
      }
      stage.dataset.phase = 'travelling';
      const p = find(pick.region, pick.area);
      if (p && map) {
        caption.textContent = `Next stop: ${pick.area}`;
        if (reduced()) map.setView([p.lat, p.lng], 14, { animate: false });
        else
          await new Promise((resolve) => {
            const done = () => {
              clearTimeout(timer);
              map?.off('moveend', done);
              finishFrame = null;
              resolve();
            };
            const timer = setTimeout(done, 1500);
            finishFrame = done;
            map.once('moveend', done);
            map.flyTo([p.lat, p.lng], 14, { duration: 1.15 });
          });
        if (cancelled) return;
        marker = window.L.circleMarker([p.lat, p.lng], {
          radius: 9,
          color: '#fff8eb',
          weight: 3,
          fillColor: '#953f2d',
          fillOpacity: 1,
        }).addTo(map);
        caption.textContent = `${pick.area} · approximate area, not the venue entrance`;
      } else
        caption.textContent = `${pick.area} · ${p ? 'map unavailable' : 'no verified map position'}. Check directions in the idea.`;
      stage.dataset.phase = 'landed';
      stage.classList.add('has-landed');
    }
    const resize = new ResizeObserver(() =>
      map?.invalidateSize({ animate: false }),
    );
    resize.observe(stage);
    active = {
      scope,
      animate,
      dispose() {
        cancelled = true;
        abort.abort();
        cancelAnimationFrame(frame);
        for (const element of [body, cube])
          for (const animation of element.getAnimations()) animation.cancel();
        finishFrame?.();
        resize.disconnect();
        map?.remove();
        map = null;
      },
    };
    return active;
  }
  return { mount, destroy };
})();
