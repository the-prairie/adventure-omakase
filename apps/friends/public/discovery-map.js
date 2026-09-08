'use strict';
window.OmakaseMap = (() => {
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
        const note = document.getElementById('map-load-note');
        if (note)
          note.textContent =
            'Some map tiles could not load. You can still choose an area below.';
      });
      const layer = L.layerGroup().addTo(map);
      const choose = (p) => select(p.region, p.area);
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
              c.region === point.region &&
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
          const label =
            group.length > 1
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
          marker.on('click', () => {
            if (group.length === 1) return choose(first);
            if (map.getZoom() < 16) {
              map.fitBounds(
                group.map((p) => [p.lat, p.lng]),
                { padding: [70, 70], maxZoom: Math.min(16, map.getZoom() + 3) },
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
