import { test, expect } from './runtime.mjs';

const action = (page, name) =>
  page.locator(`[data-action="${name}"]:visible`).first();
const close = (page) => action(page, 'close').click();

test('calendar and shared dates lead to native plans, with preserved invitation edits', async ({
  page,
  runtime,
}, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(runtime.url + '/example.html');
  await expect(page.locator('.trip-home')).toBeVisible();
  expect((await page.locator('.trip-home').boundingBox()).height).toBeLessThan(
    220,
  );
  await page.screenshot({ path: info.outputPath('home-desktop.png') });
  await page
    .locator('.invite-title')
    .filter({ hasText: 'A river run.' })
    .click();
  await expect(page.locator('#rsvp-form')).toBeVisible();
  await expect(page.locator('#rsvp-form [name=choice]:checked')).toHaveValue(
    /.+/,
  );
  await page.screenshot({ path: info.outputPath('join-desktop.png') });
  await page.locator('#rsvp-form button[value=joined]').click();
  await expect(page.locator('#rsvp-form button[value=joined]')).toContainText(
    'Update my part',
  );
  let downloads = 0;
  page.on('download', () => downloads++);
  await action(page, 'calendar-plan').click();
  await expect(page.locator('.trip-calendar')).toBeVisible();
  await expect(page.locator('.date-btn.active')).toHaveAttribute(
    'data-id',
    '2026-10-04',
  );
  await expect(page.locator('.commitment')).toContainText('09:00–10:00');
  await expect(page.locator('.commitment')).toContainText('just your part');
  await page.screenshot({ path: info.outputPath('calendar-desktop.png') });
  await page.locator('[data-action=calendar-scope][data-id=group]').click();
  await expect(page.locator('.commitment')).toHaveCount(2);
  await page.locator('[data-nav=people]:visible').first().click();
  await expect(page.locator('.overlap-opportunity').first()).toBeVisible();
  await page.locator('.window-timeline .head[data-id="2026-10-04"]').click();
  await expect(page.locator('.overlap-day')).toContainText('Theo · Osaka');
  await page.screenshot({ path: info.outputPath('overlap-desktop.png') });
  await page.locator('[data-action=overlap-plan][data-id=osaka]').click();
  await expect(page.locator('#f-date')).toHaveValue('2026-10-04');
  await expect(page.locator('#f-region')).toHaveValue('osaka');
  await close(page);
  await page.locator('#demo-person').selectOption('example-theo');
  await page.locator('[data-nav=plans]:visible').first().click();
  await page
    .locator('.invite-title')
    .filter({ hasText: 'A river run.' })
    .click();
  await expect(page.locator('.host-actions')).toContainText('You’re hosting');
  await expect(
    page.locator('.host-actions [data-action=share-plan]'),
  ).toBeVisible();
  await action(page, 'plan-edit').click();
  await expect(page.locator('.plan-extra')).not.toHaveAttribute('open');
  const before = await page
    .locator('#plan-form')
    .evaluate((form) => Object.fromEntries(new FormData(form)));
  await page.locator('#f-title').fill('A river run. Coffee by the bridge.');
  await page.screenshot({ path: info.outputPath('edit-desktop.png') });
  await page.locator('#plan-form [type=submit]').click();
  await expect(page.locator('#plan-form')).toHaveCount(0);
  await action(page, 'plan-edit').click();
  const after = await page
    .locator('#plan-form')
    .evaluate((form) => Object.fromEntries(new FormData(form)));
  for (const key of [
    'kind',
    'joinStyle',
    'effort',
    'cost',
    'booking',
    'capacity',
    'mapLink',
    'description',
  ])
    expect(after[key]).toBe(before[key]);
  await expect(page.locator('[data-segment]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('edit-mobile.png') });
  await close(page);
  await page
    .locator('.invite-title')
    .filter({ hasText: 'A river run. Coffee by the bridge.' })
    .click();
  await action(page, 'calendar-plan').click();
  await page.screenshot({ path: info.outputPath('calendar-mobile.png') });
  expect(downloads).toBe(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('visual discoveries roll real dice, recover empty filters and reshuffle an exhausted shortlist', async ({
  page,
  runtime,
}, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(runtime.url + '/example.html');
  await page.locator('[data-nav=discover]:visible').first().click();
  await expect(page.locator('.discovery-image').first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('discover-desktop.png') });
  await action(page, 'dice').click();
  await expect(page.locator('.dice-face')).toHaveCount(6);
  await page.locator('#dice-region').selectOption('tokyo');
  await page.locator('#dice-area').selectOption('Yanaka & Nezu');
  await page.locator('#dice-mood').selectOption('Food');
  await expect(page.locator('#dice-form [type=submit]')).toBeEnabled();
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-form')).toHaveAttribute(
    'data-rolling',
    'true',
  );
  await page.screenshot({ path: info.outputPath('dice-rolling.png') });
  await expect(page.locator('#dice-result .discovery')).toBeVisible();
  await expect(page.locator('#dice-form')).not.toHaveAttribute('data-rolling');
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-result .discovery')).toBeVisible();
  await expect(page.locator('#dice-result')).toContainText('Fresh round');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('dice-result-mobile.png') });
  await page.locator('#dice-mood').selectOption('Water');
  await expect(page.locator('#dice-result .discovery')).toHaveCount(0);
  await expect(page.locator('#dice-form [type=submit]')).toBeDisabled();
  await expect(page.locator('#dice-alternatives button').first()).toBeVisible();
  await page.screenshot({
    path: info.outputPath('dice-alternatives-mobile.png'),
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#dice-alternatives button').first().click();
  await expect(page.locator('#dice-result .discovery')).toBeVisible();
  expect(
    await page
      .locator('.dice-cube')
      .evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#dice-form [type=submit]').click();
  await close(page);
  await expect(page.locator('#dialog')).not.toHaveAttribute('open');
  expect(errors).toEqual([]);
});
