'use strict';
// Keep degraded-map recovery in the visible map, including on a phone.
function showMapFeedback(message) {
  const feedback = document.querySelector('.map-feedback');
  if (!feedback) return;
  feedback.querySelector('span').textContent = message;
  feedback.hidden = false;
}

window.OmakaseFallbackMap = (() => {
  let map, observer, camera, lastRegion, lastArea;
  const regions = {
    tokyo: 'Tokyo & nearby',
    osaka: 'Osaka & beyond',
    okinawa: 'Okinawa islands',
  };
  function destroy() {
    observer?.disconnect();
    if (map) {
      camera = { center: map.getCenter(), zoom: map.getZoom() };
      map.off('moveend');
      map.remove();
      map = null;
    }
  }
  function mount({ catalogue, region, area, select }) {
    const container = document.getElementById('area-map');
    if (!container || !window.L) return;
    const L = window.L;
    const points = window.OMAKASE.areas
      .filter((p) => region === 'all' || p.region === region)
      .map((p) => ({
        ...p,
        count: catalogue.filter(
          (a) => a.region === p.region && a.area === p.area,
        ).length,
      }))
      .filter((p) => p.count);
    const selected = points.find((p) => p.area === area);
    const start = () => {
      if (!container.isConnected || map) return;
      map = L.map(container, {
        scrollWheelZoom: false,
        maxZoom: 16,
        minZoom: 4,
        zoomControl: true,
        attributionControl: true,
      });
      const currentMap = map;
      const tiles = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 16,
          keepBuffer: 0,
          updateWhenIdle: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        },
      ).addTo(map);
      tiles.on('tileerror', () => {
        if (map !== currentMap || !container.isConnected) return;
        showMapFeedback(
          'Map tiles could not load. Choose an area or browse places.',
        );
        const note = document.getElementById('map-load-note');
        if (note)
          note.textContent =
            'Some map tiles could not load. You can still choose an area below.';
      });
      const layer = L.layerGroup().addTo(map);
      const choose = (p) => select(p.region, p.area);
      let keyboardZoom = false;
      function draw() {
        if (map !== currentMap || !container.isConnected) return;
        layer.clearLayers();
        const clusters = [];
        for (const point of points) {
          const pixel = map.latLngToContainerPoint([point.lat, point.lng]);
          const cluster = clusters.find(
            (c) =>
              point.area !== area &&
              c.points[0].area !== area &&
              (c.region === point.region || map.getZoom() < 8) &&
              Math.abs(c.pixel.x - pixel.x) < 145 &&
              Math.abs(c.pixel.y - pixel.y) < 55,
          );
          if (cluster) cluster.points.push(point);
          else clusters.push({ region: point.region, pixel, points: [point] });
        }
        for (const cluster of clusters) {
          const group = cluster.points,
            first = group[0],
            count = group.reduce((n, p) => n + p.count, 0);
          const regionNames = [...new Set(group.map((p) => p.region))];
          const label =
            regionNames.length > 1
              ? regionNames
                  .map(
                    (r) =>
                      ({ tokyo: 'Tokyo', osaka: 'Osaka', okinawa: 'Okinawa' })[
                        r
                      ],
                  )
                  .join(' + ')
              : group.length > 1
                ? map.getZoom() < 8
                  ? region === 'all'
                    ? regions[first.region]
                    : `${first.area.includes(':') ? first.area.split(':')[0] : { tokyo: 'Tokyo', osaka: 'Osaka', okinawa: 'Okinawa main island' }[first.region]} & nearby`
                  : `${first.area} + ${group.length - 1} areas`
                : first.area;
          const marker = L.marker([first.lat, first.lng], {
            icon: L.divIcon({
              className: 'area-map-marker',
              html: '<span class="area-marker-label"></span>',
              iconSize: [132, 44],
              iconAnchor: [66, 22],
            }),
            title: `${label}: ${count} discoveries`,
            keyboard: true,
            zIndexOffset: first.area === area ? 1000 : 0,
          }).addTo(layer);
          const el = marker.getElement();
          el.querySelector('span').textContent = `${label} · ${count}`;
          el.setAttribute(
            'aria-label',
            `${label}: ${count} discoveries${group.length > 1 ? ', zoom in' : ', select area'}`,
          );
          el.classList.toggle(
            'selected',
            group.some((p) => p.area === area),
          );
          el.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            keyboardZoom = group.length > 1;
            marker.fire('click');
          });
          marker.on('click', () => {
            if (group.length === 1) return choose(first);
            if (map.getZoom() < 16) {
              const bounds = L.latLngBounds(group.map((p) => [p.lat, p.lng]));
              const target = Math.max(
                map.getZoom() + 1,
                map.getBoundsZoom(bounds, false, [140, 140]),
              );
              map.setView(
                bounds.getCenter(),
                Math.min(16, map.getZoom() + 3, target),
              );
            } else {
              const list = document.createElement('div');
              for (const p of group) {
                const button = document.createElement('button');
                button.className = 'text-btn';
                button.textContent = `${p.area} · ${p.count} ideas`;
                button.onclick = () => choose(p);
                list.append(button);
              }
              marker.bindPopup(list).openPopup();
            }
          });
        }
        if (keyboardZoom) {
          container
            .querySelector('.area-map-marker')
            ?.focus({ preventScroll: true });
          keyboardZoom = false;
        }
      }
      if (selected) map.setView([selected.lat, selected.lng], 13);
      else if (camera && lastRegion === region && lastArea === area)
        map.setView(camera.center, camera.zoom);
      else
        map.fitBounds(
          points.map((p) => [p.lat, p.lng]),
          { padding: [45, 45], maxZoom: 10 },
        );
      lastRegion = region;
      lastArea = area;
      map.on('moveend', draw);
      draw();
    };
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        start();
      }
    });
    observer.observe(container);
  }
  return { mount, destroy };
})();

// One Google map survives view switches and ordinary app renders. Catalogue
// content stays local; no Places search, geocoding or location access occurs.
window.OmakaseMap = (() => {
  let map,
    element,
    loader,
    current,
    authorizationFailed = false,
    generation = 0;
  let markers = [],
    lastScope = '';
  const cameras = {
    all: { center: { lat: 32.7, lng: 134 }, zoom: 5 },
    tokyo: { center: { lat: 35.7, lng: 139.7 }, zoom: 9 },
    osaka: { center: { lat: 34.7, lng: 135.5 }, zoom: 9 },
    okinawa: { center: { lat: 25.5, lng: 126.8 }, zoom: 6 },
  };
  function load() {
    if (authorizationFailed)
      return Promise.reject(Error('Google map authorization unavailable'));
    if (loader) return loader;
    loader = (async () => {
      const response = await fetch('/api/maps/config');
      if (!response.ok) throw Error('Map configuration unavailable');
      const config = await response.json();
      if (!config.browserKey) throw Error('Google map not configured');
      if (window.google?.maps?.Map) return;
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(
          () => reject(Error('Map loading timed out')),
          15000,
        );
        window.omakaseGoogleReady = () => {
          clearTimeout(timeout);
          resolve();
        };
        window.gm_authFailure = () => {
          authorizationFailed = true;
          clearTimeout(timeout);
          reject(Error('Google map authorization unavailable'));
          fallback();
        };
        script.referrerPolicy = 'strict-origin-when-cross-origin';
        script.src =
          'https://maps.googleapis.com/maps/api/js?' +
          new URLSearchParams({
            key: config.browserKey,
            callback: 'omakaseGoogleReady',
            loading: 'async',
            v: 'quarterly',
          });
        script.async = true;
        script.onerror = () => {
          clearTimeout(timeout);
          reject(Error('Map could not load'));
        };
        document.head.append(script);
      });
    })();
    return loader;
  }
  function detach() {
    generation++;
    window.OmakaseFallbackMap?.destroy();
    element?.remove();
  }
  function fallback() {
    if (!current?.visible || !document.getElementById('area-map')) return;
    element?.remove();
    window.OmakaseFallbackMap?.mount(current);
    const note = document.getElementById('map-load-note');
    if (note)
      note.textContent =
        'Google Maps is unavailable. The area map and Fieldbook remain available; markers show approximate areas.';
  }
  function draw() {
    if (!map || !current) return;
    markers.forEach((m) => m.setMap(null));
    markers = [];
    const { catalogue, region, area, select, place, selected } = current;
    const locations = window.OMAKASE.locations || {};
    const points = window.OMAKASE.areas
      .filter((p) => region === 'all' || p.region === region)
      .map((p) => ({
        ...p,
        count: catalogue.filter(
          (a) => !locations[a.id] && a.region === p.region && a.area === p.area,
        ).length,
      }))
      .filter((p) => p.count);
    for (const a of catalogue) {
      const location = locations[a.id];
      if (location)
        points.push({
          ...location,
          id: a.id,
          title: a.title,
          area: a.area,
          region: a.region,
          count: 1,
        });
    }
    // Group broad overviews; at neighborhood zoom show the underlying areas.
    const zoom = map.getZoom() || 5;
    const groups = [];
    const cell = zoom < 7 ? 3 : zoom < 10 ? 0.15 : 0;
    for (const point of points) {
      const key =
        point.id === selected || point.area === area || !cell
          ? `${point.region}:${point.id || point.area}`
          : `${point.region}:${Math.floor(point.lat / cell)}:${Math.floor(point.lng / cell)}`;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, points: [] };
        groups.push(group);
      }
      group.points.push(point);
    }
    for (const { points: group } of groups) {
      const p = group[0];
      const count = group.reduce((sum, a) => sum + a.count, 0);
      const title =
        group.length > 1
          ? `${p.region === 'tokyo' ? 'Tokyo' : p.region === 'osaka' ? 'Osaka & beyond' : 'Okinawa'}: ${count} discoveries, zoom in`
          : p.id
            ? `${p.title}: mapped site, show discovery`
            : `${p.area}: ${count} discoveries, select area`;
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: p.lat, lng: p.lng },
        title,
        label: {
          text: group.length === 1 && p.id ? '•' : String(count),
          color: '#ffffff',
          fontWeight: '600',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: p.id || p.area === area ? '#a04f35' : '#294b3b',
          fillOpacity: 1,
          strokeColor: '#faf7ef',
          strokeWeight: 2,
        },
        optimized: false,
      });
      marker.addListener('click', () => {
        if (group.length === 1) {
          if (p.id) place(p.id);
          else select(p.region, p.area);
        } else {
          map.setCenter({ lat: p.lat, lng: p.lng });
          map.setZoom(Math.min(13, zoom + 3));
        }
      });
      markers.push(marker);
    }
  }
  async function mount(options) {
    current = options;
    const ticket = ++generation;
    const host = document.getElementById('area-map');
    if (!host || !options.visible) return;
    try {
      await load();
      if (ticket !== generation || !host.isConnected) return;
      if (!element) {
        element = document.createElement('div');
        element.className = 'google-discovery-map';
      }
      host.replaceChildren(element);
      if (!map) {
        map = new window.google.maps.Map(element, {
          ...cameras.all,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
          clickableIcons: false,
        });
        map.addListener('idle', draw);
      }
      window.google.maps.event.trigger(map, 'resize');
      const scope = `${options.region}:${options.area}:${options.selected || ''}`;
      if (scope !== lastScope) {
        const point =
          window.OMAKASE.locations?.[options.selected] ||
          window.OMAKASE.areas.find(
            (p) => p.region === options.region && p.area === options.area,
          );
        const camera = point
          ? { center: { lat: point.lat, lng: point.lng }, zoom: 13 }
          : cameras[options.region] || cameras.all;
        map.setCenter(camera.center);
        map.setZoom(camera.zoom);
        lastScope = scope;
      }
      draw();
    } catch {
      if (ticket === generation && host.isConnected) fallback();
    }
  }
  return { mount, detach };
})();
