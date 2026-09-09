import { test, expect } from './runtime.mjs';

test('curated outings lead to existing guides and preserve discovery filters', async ({
  page,
  runtime,
}, info) => {
  await page.goto(runtime.url + '/example.html#demo/discover');
  const section = page.getByRole('region', {
    name: 'Make an afternoon of it.',
  });
  await expect(section).toBeVisible();
  await expect(section.locator('details')).toHaveCount(6);
  await section.locator('summary').first().click();
  await expect(section.locator('details').first()).toHaveAttribute('open', '');
  const firstStop = section
    .locator('details')
    .first()
    .locator('[data-action=discovery]')
    .first();
  const id = await firstStop.getAttribute('data-id');
  await firstStop.click();
  await expect(page.locator('#dialog')).toBeVisible();
  await expect(page.locator('#dialog [data-action=plan-from]')).toHaveAttribute(
    'data-id',
    id,
  );
  await expect(
    page.locator('#dialog [data-action=save-detail]'),
  ).toHaveAttribute('data-id', id);
  await page.locator('#dialog [data-action=close]').click();
  await page.locator('[data-action=region][data-id=okinawa]').click();
  await expect(section.locator('details')).toHaveCount(3);
  await page.locator('#search').fill('pottery');
  await expect(section).toHaveCount(0);
  await page.locator('#search').fill('');
  await expect(section).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('curation-desktop-top.png') });
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('curation-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('curation-mobile-top.png') });
  const preview = await section.locator('summary').first().boundingBox();
  expect(preview.y + preview.height).toBeLessThan(780);
  await section.locator('summary').first().click();
  await section.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('curation-mobile.png') });
  await page.locator('[data-action=discovery-library][data-id=saved]').click();
  await expect(section).toHaveCount(0);
});
