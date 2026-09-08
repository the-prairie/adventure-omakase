import { test, expect } from './runtime.mjs';

// A bounded provider fixture proves our integration contract. Real Google
// rendering and the production referrer restriction are checked on preview.
const googleFixture = `(() => {
  let maps = 0;
  class Map {
    constructor(el, options) { this.el = el; this.zoom = options.zoom; this.listeners = {}; el.dataset.mapInstances = String(++maps); }
    getZoom() { return this.zoom; }
    setZoom(value) { this.zoom = value; }
    setCenter(value) { this.el.dataset.center = JSON.stringify(value); }
    addListener(name, fn) { this.listeners[name] = fn; }
  }
  class Marker {
    constructor(options) { this.el = document.createElement('button'); this.el.textContent = options.title; this.el.className = 'fixture-map-marker'; options.map.el.append(this.el); }
    addListener(name, fn) { this.el.addEventListener(name, fn); }
    setMap(value) { if (!value) this.el.remove(); }
  }
  window.google = { maps: { Map, Marker, SymbolPath: { CIRCLE: 0 }, event: { trigger() {} } } };
  window.omakaseGoogleReady();
})();`;

test('Map and Fieldbook preserve preferences, place context and one map instance', async ({
  page,
  runtime,
}, info) => {
  let loads = 0;
  await page.route('**/api/maps/config', (route) =>
    route.fulfill({ json: { browserKey: 'synthetic-browser-key' } }),
  );
  await page.route('https://maps.googleapis.com/maps/api/js?*', (route) => {
    loads++;
    return route.fulfill({
      contentType: 'text/javascript',
      body: googleFixture,
    });
  });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await expect(
    page.getByRole('button', { name: 'Fieldbook', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.discovery-atlas')).toBeHidden();
  expect(loads).toBe(0);
  await page.locator('[data-action=region][data-id=osaka]').click();
  await page.locator('#area-filter').selectOption('Karahori & Tanimachi');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.google-discovery-map')).toHaveAttribute(
    'data-map-instances',
    '1',
  );
  await expect(page.locator('.fixture-map-marker')).toHaveCount(1);
  await expect(page.locator('.fixture-map-marker')).toContainText('Karahori');
  await page.getByRole('button', { name: 'Fieldbook', exact: true }).click();
  await expect(page.locator('#area-filter')).toHaveValue(
    'Karahori & Tanimachi',
  );
  await page.locator('[data-action=show-on-map][data-id=osaka-013]').click();
  await expect(page.locator('.map-current')).toContainText('Karahori');
  await expect(page.locator('.google-discovery-map')).toHaveAttribute(
    'data-map-instances',
    '1',
  );
  await expect(page.locator('#map-selection')).toBeFocused();
  await page.getByRole('button', { name: 'Fieldbook', exact: true }).click();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-current')).toContainText('Karahori');
  await expect(page.locator('.google-discovery-map')).toHaveAttribute(
    'data-map-instances',
    '1',
  );
  expect(loads).toBe(1);
  await page.locator('#discovery-filters summary').click();
  await page.locator('[data-action=clear-filters]').click();
  await page.locator('#search').fill('Nezu Shrine');
  await expect(page.locator('.fixture-map-marker')).toHaveCount(1);
  await page.locator('.fixture-map-marker').click();
  await expect(page.locator('.map-current')).toContainText('Nezu Shrine');
  await expect(page.locator('#map-selection')).toContainText('Mapped site');
  await expect(page.locator('#map-selection a')).toHaveAttribute(
    'href',
    'https://en.wikipedia.org/wiki/Nezu_Shrine',
  );
  await page.getByRole('button', { name: 'Fieldbook', exact: true }).click();
  await expect(page.locator('#search')).toHaveValue('Nezu Shrine');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.google-discovery-map')).toHaveAttribute(
    'data-map-instances',
    '1',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#area-map')).toBeInViewport();
  await page.screenshot({
    path: info.outputPath('map-mode-mobile-fixture.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Map', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('a failed Google loader keeps discovery usable', async ({
  page,
  runtime,
}) => {
  await page.route('**/api/maps/config', (route) =>
    route.fulfill({ json: { browserKey: 'synthetic-browser-key' } }),
  );
  await page.route('https://maps.googleapis.com/**', (route) => route.abort());
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map-load-note')).toContainText(
    'Google Maps is unavailable',
  );
  await page.getByRole('button', { name: 'Fieldbook', exact: true }).click();
  await expect(page.locator('#discovery-results')).not.toBeEmpty();
});

test('late Google authorization failure remains a fallback after switching views', async ({
  page,
  runtime,
}) => {
  await page.route('**/api/maps/config', (route) =>
    route.fulfill({ json: { browserKey: 'synthetic-browser-key' } }),
  );
  await page.route('https://maps.googleapis.com/maps/api/js?*', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: googleFixture }),
  );
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.google-discovery-map')).toBeVisible();
  await page.evaluate(() => window.gm_authFailure());
  await expect(page.locator('#map-load-note')).toContainText(
    'Google Maps is unavailable',
  );
  await page.getByRole('button', { name: 'Fieldbook', exact: true }).click();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.google-discovery-map')).toHaveCount(0);
  await expect(page.locator('#map-load-note')).toContainText(
    'Google Maps is unavailable',
  );
});
