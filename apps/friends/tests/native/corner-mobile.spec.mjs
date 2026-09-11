import { test, expect } from './runtime.mjs';
import { mkdir } from 'node:fs/promises';

test('compact discovery keeps search, saves, sources, map and invitations connected', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(runtime.url + '/example.html#demo/discover');
  await expect(page.locator('.places-heading')).toBeVisible();
  await expect(page.locator('.explore-opening')).toBeHidden();
  await expect(page.locator('#search')).toBeInViewport();
  await expect(
    page.locator('#discovery-results .discovery').first(),
  ).toBeInViewport();
  await mkdir('.impeccable/review', { recursive: true });
  await page.screenshot({ path: '.impeccable/review/mobile.png' });
  await page.locator('#search').fill('Nezu Shrine');
  await expect(page.locator('#discovery-results .discovery')).toHaveCount(1);
  await page
    .locator('#discovery-results [data-action=discovery]')
    .last()
    .click();
  await expect(page.locator('.place-sheet')).toBeVisible();
  await expect(page.locator('.place-title h2')).toContainText('Nezu');
  await expect(
    page.locator('.place-title [data-action=save-detail]'),
  ).toBeInViewport();
  await expect(
    page.locator('.place-action-bar [data-action=plan-from]'),
  ).toBeInViewport();
  await expect(page.locator('.place-sheet iframe')).toHaveCount(0);
  const close = await page
    .locator('.place-sheet [data-action=close]')
    .boundingBox();
  expect(close.width).toBe(44);
  expect(close.height).toBe(44);
  await page.screenshot({ path: '.impeccable/review/mobile-place.png' });
  await page.locator('[data-action=save-detail]').click();
  await expect(page.locator('[data-action=save-detail]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.place-private-note')).toContainText(
    'Saves are private',
  );
  await page.locator('.place-research summary').click();
  await expect(
    page.getByText('A map search is not a verified pin', { exact: false }),
  ).toBeVisible();
  await page.locator('[data-action=plan-from]').click();
  await expect(page.locator('#plan-form')).toBeVisible();
  await expect(page.locator('#f-title')).toHaveValue(/Nezu/);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  // Saved filtering retains the canonical place and saved state through reload.
  await page.locator('[data-action=discovery-library][data-id=saved]').click();
  await expect(page.locator('#discovery-results')).toContainText('Nezu');
  await page.reload();
  await page.locator('[data-action=discovery-library][data-id=saved]').click();
  await expect(page.locator('#discovery-results')).toContainText('Nezu');
  await page.locator('[data-action=discovery-library][data-id=all]').click();
  await page.locator('#discovery-filters summary').click();
  await page.locator('#area-filter').selectOption('Yanaka & Nezu');
  await expect(page.locator('#result-count')).not.toContainText(
    '300 discoveries',
  );
  await page.locator('#discovery-filters summary').click();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#area-map')).toBeVisible();
  await expect(page.locator('.area-map-marker').first()).toBeVisible();
  await expect(page.locator('#map-load-note')).toContainText('could not load');
  await expect(page.locator('.map-feedback')).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Browse places', exact: false }),
  ).toBeInViewport();
  await page.screenshot({ path: '.impeccable/review/mobile-map.png' });
  await page.getByRole('button', { name: 'Fieldbook', exact: true }).click();
  await page.locator('#discovery-filters summary').click();
  await page.locator('[data-action=clear-filters]').click();
  await page.locator('#discovery-filters summary').click();
  await page.locator('.places-stories > summary').click();
  await expect(page.locator('.home-dice')).toBeVisible();
  await page.locator('.home-dice .dice-table').click();
  await expect(page.locator('#home-dice-result h3')).toBeVisible();
  await page.locator('.places-stories > summary').click();
  for (const width of [320, 393, 430, 1440]) {
    await page.setViewportSize({ width, height: 852 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: '.impeccable/review/desktop.png' });
});
