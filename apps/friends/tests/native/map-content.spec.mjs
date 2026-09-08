import { test, expect } from './runtime.mjs';

test('area map filters discoveries and experience context stays visible', async ({
  page,
  runtime,
}, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Offline tile failure must retain an accessible geographic index.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('https://maps.google.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>Synthetic map fixture</p>',
    }),
  );
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.locator('#area-map').scrollIntoViewIfNeeded();
  await expect(page.locator('.area-map-marker').first()).toBeVisible();
  await expect(page.locator('#area-map')).toContainText('Osaka');
  await expect(page.locator('#map-load-note')).toContainText('could not load');
  await page.locator('[data-action=region][data-id=osaka]').click();
  await page.locator('#area-filter').selectOption('Karahori & Tanimachi');
  await expect(page.locator('#map-selection')).toContainText('Karahori');
  await expect(page.locator('#discovery-results')).toContainText('Karahori');
  await page.locator('#area-map').scrollIntoViewIfNeeded();
  await page.locator('.area-map-marker[title^="Karahori"]').press('Enter');
  await expect(page.locator('#area-filter')).toHaveValue(
    'Karahori & Tanimachi',
  );
  await page.screenshot({ path: info.outputPath('area-map-desktop.png') });
  await page
    .locator('.discovery-grid [data-action=discovery][data-id=osaka-013]')
    .first()
    .click();
  await expect(page.locator('.experience-context .lede')).toBeVisible();
  await expect(page.locator('.experience-context')).toContainText(
    'covered shopping street',
  );
  await expect(page.locator('#dialog details')).toHaveCount(0);
  await expect(page.locator('#dialog img')).toHaveAttribute(
    'src',
    /karahori-arcade/,
  );
  await page
    .locator('#dialog [data-action=discovery][data-id=osaka-042]')
    .click();
  await expect(page.locator('.experience-menu a')).toHaveAttribute(
    'href',
    /27060944\/dtlmenu\/photo/,
  );
  await expect(page.locator('.experience-menu')).toContainText(
    'Diner-uploaded',
  );
  await page.locator('[data-action=close]').click();
  await page.locator('[data-action=region][data-id=tokyo]').click();
  await page.locator('#search').fill('loach');
  await page.locator('.discovery-grid [data-action=discovery]').first().click();
  await expect(page.locator('.experience-gallery img')).toHaveCount(2);
  await expect(page.locator('.experience-menu a')).toHaveAttribute(
    'href',
    'https://dozeu.com/food/',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator('.experience-gallery img')
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: info.outputPath('meal-mobile.png') });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
