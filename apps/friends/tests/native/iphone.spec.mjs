import { test, expect } from './runtime.mjs';
import { devices } from '@playwright/test';
test.use({
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  userAgent: devices['iPhone 13'].userAgent,
});

test('phone task sheets keep review reachable, fit small screens and preserve drafts across viewport changes', async ({
  page,
  runtime,
}, info) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  const dock = page.locator('.nav-dock');
  await expect(dock).toBeVisible();
  for (const button of await dock.locator('button').all()) {
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  const collection = page.locator(
    '[data-collection-id=naha-sakaemachi-evening]',
  );
  await collection.locator('summary').click();
  await collection.locator('[data-action=plan-collection]').click();
  const dialog = page.locator('#dialog');
  const review = page.locator('[data-outing=review]');
  const visibleAction = async () => {
    const box = await review.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    expect(box.height).toBeGreaterThanOrEqual(44);
  };
  await expect(dialog).toHaveCSS('border-radius', '0px');
  await visibleAction();
  await page.screenshot({ path: info.outputPath('iphone-planner-top.png') });
  await page.locator('#outing-note').fill('Synthetic phone draft');
  await visibleAction();
  expect(
    await page
      .locator('#outing-note')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.setViewportSize({ width: 375, height: 430 });
  await expect
    .poll(async () => (await dialog.boundingBox()).height)
    .toBeLessThanOrEqual(431);
  await page.locator('#outing-note').scrollIntoViewIfNeeded();
  await visibleAction();
  await page.screenshot({ path: info.outputPath('iphone-short-viewport.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#outing-note')).toHaveValue(
    'Synthetic phone draft',
  );
  await review.click();
  await expect(page.locator('#plan-form')).toBeVisible();
  const publish = page.locator('#plan-form button[type=submit]');
  const box = await publish.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await publish.click();
  await expect(page.locator('#f-meeting')).toBeFocused();
  await page.screenshot({
    path: info.outputPath('iphone-invitation-review.png'),
  });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#f-description')).toContainText(
    'Synthetic phone draft',
  );
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});
