import { test, expect, TEST_KEY } from './runtime.mjs';

test('choice controls preserve forms, keyboard navigation and dialog boundaries', async ({
  page,
  runtime,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Synthetic control tester');
  await page.locator('#auth-form [type=submit]').click();
  await page.locator('[data-nav=discover]:visible').first().click();
  await page.locator('.places-stories > summary').click();
  await page.locator('[data-action=dice]:visible').first().click();
  await page
    .getByRole('button', { name: 'Change preferences', exact: true })
    .click();
  const trigger = (id) =>
    page.locator(`#${id}`).locator('..').getByRole('combobox');
  await trigger('dice-region').click();
  await expect(trigger('dice-region')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.choice-list:popover-open')).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dice-region')).toHaveValue('tokyo');
  await expect(trigger('dice-region')).toContainText('Tokyo');
  await expect(page.locator('#dice-area option')).not.toHaveCount(0);

  await trigger('dice-region').click();
  await page.keyboard.type('Okin');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dice-region')).toHaveValue('okinawa');
  await trigger('dice-region').click();
  await page.keyboard.press('Escape');
  await expect(trigger('dice-region')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.locator('#dialog')).toBeVisible();
  await expect(trigger('dice-region')).toBeFocused();

  await page.locator('#dice-region').selectOption('osaka');
  await expect(trigger('dice-region')).toContainText('Osaka');
  await trigger('dice-area').click();
  const popup = page.locator('.choice-list:popover-open');
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: info.outputPath('choice-mobile-open.png') });
  await page.setViewportSize({ width: 1344, height: 960 });
  await trigger('dice-area').click();
  await trigger('dice-area').click();
  await page.screenshot({ path: info.outputPath('choice-desktop-open.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Tab');
  await expect(popup).toHaveCount(0);
  await expect(page.locator('#dialog')).toBeVisible();

  await trigger('dice-time').click();
  await expect(trigger('dice-time')).toHaveAttribute('aria-expanded', 'true');
  await page
    .getByRole('option', { name: 'Up to 90 minutes', exact: true })
    .click();
  await expect(page.locator('#dice-time')).toHaveValue('90');
  await expect(trigger('dice-time')).toContainText('Up to 90 minutes');
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-result')).not.toBeEmpty();
  await expect(page.locator('#dialog')).toBeVisible();
  await page.locator('[data-action=close]:visible').click();
  await page.locator('#discovery-filters summary').click();
  await trigger('time-filter').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.locator('#discovery-filters')).toHaveAttribute('open', '');
  await expect(page.locator('#time-filter')).not.toHaveValue('all');
  await page.locator('#discovery-filters summary').click();
  await expect(page.locator('#discovery-filters')).not.toHaveAttribute('open');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
