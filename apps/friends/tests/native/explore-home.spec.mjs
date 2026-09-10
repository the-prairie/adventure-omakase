import { test, expect } from './runtime.mjs';

test('discovery leads with playable dice and researched outings, and keeps the day available', async ({
  page,
  runtime,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(runtime.url + '/example.html');
  await expect(page.locator('.explore-opening')).toBeVisible();
  await expect(page.locator('.explore-lead img')).toBeVisible();
  await expect(page.locator('#main form')).toHaveCount(0);
  await expect(page.locator('.home-dice')).toContainText('Namba');
  await page.screenshot({ path: info.outputPath('explore-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.home-dice .dice-table')).toBeInViewport();
  await page.screenshot({ path: info.outputPath('explore-mobile.png') });
  await page.locator('.home-dice .dice-table').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#home-dice-result h3')).toBeVisible();
  await expect(page.locator('#home-dice-result')).toBeFocused();
  const picked = await page
    .locator('#home-dice-result [data-action=discovery]')
    .getAttribute('data-id');
  await expect(page.locator('#home-dice-result')).toContainText('Namba');
  await page.locator('#home-dice-result [data-action=save]').click();
  await expect(page.locator('#home-dice-result')).toContainText('Saved');
  await page.locator('#home-dice-result [data-action=discovery]').click();
  await expect(page.locator('#dialog [data-action=plan-from]')).toHaveAttribute(
    'data-id',
    picked,
  );
  await page.locator('#dialog [data-action=close]').click();
  await expect(page.locator('.home-dice .dice-table')).toBeVisible();
  await page.locator('[data-action=home-region][data-id=okinawa]').click();
  await expect(page.locator('.home-dice')).toContainText('Naha');
  await expect(page.locator('#home-dice-result h3')).toHaveCount(0);
  await page.locator('.explore-lead h2 [data-action=collection-story]').click();
  await expect(
    page.locator('.collection-story .curated-sources a').first(),
  ).toBeVisible();
  await expect(page.locator('.collection-story .curated-stops')).toBeVisible();
  await page.screenshot({ path: info.outputPath('outing-story-mobile.png') });
  await page.locator('#dialog [data-action=plan-collection]').click();
  await expect(page.locator('#outing-planner')).toBeVisible();
  await page.locator('#dialog [data-action=close]').click();
  await page.locator('.nav-dock [data-nav=day]').click();
  await expect(page.locator('.phone-agenda')).toBeVisible();
  await page.locator('.nav-dock [data-nav=discover]').click();
  await expect(page.locator('.explore-opening')).toBeVisible();
  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('lazy discovery photos retain their reserved height', async ({
  page,
  runtime,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/discovery/photos/**', async (route) => {
    await gate;
    await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    await page.goto(runtime.url + '/example.html', {
      waitUntil: 'domcontentloaded',
    });
    const photo = page
      .locator('.discovery-grid .card-photo .discovery-image')
      .first();
    await photo.scrollIntoViewIfNeeded();
    const before = await photo.boundingBox();
    release();
    await expect
      .poll(() =>
        photo
          .locator('img')
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
    const after = await photo.boundingBox();
    expect(after.height).toBeCloseTo(before.height, 1);
  } finally {
    release();
  }
});
