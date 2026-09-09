import { test, expect } from './runtime.mjs';

test('curated outings lead to existing guides and preserve discovery filters', async ({
  page,
  runtime,
}, info) => {
  await page.goto(runtime.url + '/example.html#demo/discover');
  const section = page.getByRole('region', {
    name: 'A few hours or a day.',
  });
  await expect(section).toBeVisible();
  const stays = page.getByRole('region', { name: 'Stay a little longer.' });
  await expect(stays.locator('details')).toHaveCount(3);
  await expect(stays).toContainText('Separate stay');
  await expect(
    section.locator('[data-travel-scale=separate-stay]'),
  ).toHaveCount(0);
  await expect(section.locator('details')).toHaveCount(9);
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
  await expect(section.locator('details')).toHaveCount(5);
  const evening = section.locator(
    '[data-collection-id=naha-sakaemachi-evening]',
  );
  await evening.locator('summary').click();
  await expect(evening).toContainText('Make time for');
  await expect(evening).toContainText('One small bar afterwards is plenty');
  await evening.locator('[data-action=discovery]').first().click();
  await expect(page.locator('#dialog')).toContainText('duruten');
  await expect(
    page.locator('#dialog [data-action=save-detail]'),
  ).toHaveAttribute('data-id', 'okinawa-042');
  await page.locator('#dialog [data-action=close]').click();
  await evening.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('balanced-evening-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await evening.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('balanced-evening-mobile.png'),
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await evening.locator('summary').click();
  const islandDay = section.locator('[data-collection-id=tokashiki-blue-day]');
  await islandDay.locator('summary').click();
  await expect(islandDay).toContainText('Rough seas can cancel boats');
  await islandDay.locator('[data-action=discovery]').click();
  await expect(
    page.locator('#dialog [data-action=save-detail]'),
  ).toHaveAttribute('data-id', 'okinawa-068');
  await page.locator('#dialog [data-action=close]').click();
  await islandDay.locator('summary').click();
  const longerStay = stays.locator(
    '[data-collection-id=yaeyama-village-and-bay]',
  );
  await longerStay.locator('summary').click();
  await expect(longerStay).toContainText(
    'October operating dates and seats are unconfirmed',
  );
  await stays.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('island-stays-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await stays.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('island-stays-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await longerStay.locator('summary').click();
  const onward = page.getByRole('region', {
    name: 'Trade the beach for lava and cedar forest',
  });
  await expect(onward).toContainText('Southern Kyushu · a separate trip north');
  await page.locator('[data-action=region][data-id=osaka]').click();
  await expect(stays).toHaveCount(0);
  await expect(onward).toHaveCount(0);
  await page.locator('[data-action=region][data-id=okinawa]').click();
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
