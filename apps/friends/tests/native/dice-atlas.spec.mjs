import { test, expect } from './runtime.mjs';

test.use({ hasTouch: true });

test('atlas dice fling, land, survive cancellation and work without map tiles', async ({
  page,
  runtime,
}, info) => {
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1344, height: 960 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  const open = async () => {
    await page.locator('[data-action=dice]:visible').first().click();
    await page.locator('#dice-region').selectOption('osaka');
    await page.locator('#dice-area').selectOption('Karahori & Tanimachi');
  };
  await open();
  await expect(page.locator('#dice-map')).toBeVisible();
  await expect(page.locator('#dice-map .leaflet-tile-pane')).toBeAttached();
  await page.screenshot({ path: info.outputPath('atlas-ready-desktop.png') });
  const die = await page.locator('.dice-table').boundingBox();
  await page.mouse.move(die.x + die.width / 2, die.y + 50);
  await page.mouse.down();
  await page.mouse.move(die.x + die.width / 2 + 100, die.y + 5, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#dice-form')).toHaveAttribute(
    'data-rolling',
    'true',
  );
  await page.screenshot({ path: info.outputPath('atlas-fling-desktop.png') });
  await expect(page.locator('.dice-atlas')).toHaveAttribute(
    'data-phase',
    'landed',
  );
  await expect(page.locator('#dice-result')).not.toBeEmpty();
  await expect(page.locator('#dice-preferences')).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Change preferences' }),
  ).toBeVisible();
  await expect(page.locator('.dice-map-caption')).toContainText('Karahori');
  await page.screenshot({
    path: info.outputPath('atlas-landed-desktop.png'),
    animations: 'disabled',
  });
  const attribution = page.locator(
    '#dice-map a[href="https://www.openstreetmap.org/copyright"]',
  );
  expect(
    await attribution.evaluate((link) => {
      const r = link.getBoundingClientRect();
      return link.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Change preferences' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Where are you exploring?' }),
  ).toBeFocused();
  await expect(page.locator('#dice-area')).toHaveValue('Karahori & Tanimachi');
  await page.locator('#dice-region').selectOption('tokyo');
  await page.locator('#dice-area').selectOption('Yanaka & Nezu');
  await page.locator('.dice-table').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('atlas-ready-mobile.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.dice-table').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dice-atlas')).toHaveAttribute(
    'data-phase',
    'landed',
  );
  await expect(page.locator('#dice-result')).toBeFocused();
  await expect(page.locator('.dice-map-caption')).toContainText(
    'Yanaka & Nezu',
  );
  await page.screenshot({
    path: info.outputPath('atlas-landed-mobile.png'),
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#dice-form [type=submit]').click();
  await page.locator('[data-action=close]:visible').click();
  let failedTiles = 0;
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    failedTiles++;
    return route.abort();
  });
  await open();
  // Use an unvisited area: a reopened map may reuse decoded image tiles.
  await page.locator('#dice-region').selectOption('okinawa');
  await expect.poll(() => failedTiles).toBeGreaterThan(0);
  await expect(page.locator('.dice-map-note')).toContainText(
    'Map tiles unavailable',
  );
  await page.locator('.dice-table').tap();
  await expect(page.locator('#dice-result')).not.toBeEmpty();
  await page.locator('#dice-result [data-action=discovery]').click();
  await expect(page.locator('#dialog')).not.toHaveClass(/atlas-dialog/);
  expect(errors).toEqual([]);
});
