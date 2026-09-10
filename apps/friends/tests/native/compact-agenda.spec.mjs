import { test, expect, TEST_KEY } from './runtime.mjs';
import { devices } from '@playwright/test';
test.use({
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent: devices['iPhone 13'].userAgent,
});
const nav = (page, view) =>
  page.locator(`[data-nav=${view}]:visible`).first().click();

test('compact agenda keeps personal participation, selected day and meeting maps aligned', async ({
  page,
  runtime,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://maps.google.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>Synthetic map fixture</p>',
    }),
  );
  await page.goto(runtime.url + '/example.html');
  await expect(page.locator('.nav-dock button')).toHaveCount(4);
  await expect(page.locator('.nav-dock')).toContainText('Today');
  await expect(page.locator('.phone-agenda')).toContainText('The day is yours');
  await page.locator('.agenda-scope [data-id=group]').click();
  await expect(page.locator('.agenda-entry')).toHaveCount(2);
  await page.locator('.agenda-row').filter({ hasText: 'A river run.' }).click();
  await expect(page.locator('.plan-background')).not.toHaveAttribute('open');
  await expect(page.locator('.plan-map-details')).not.toHaveAttribute('open');
  await expect(page.locator('.meeting-box > strong')).toBeVisible();
  await page.locator('#rsvp-form button[value=joined]').click();
  await expect(page.locator('#rsvp-form')).toContainText('Update my part');
  await page.locator('[data-action=close]').click();
  await page.locator('.agenda-scope [data-id=mine]').click();
  await expect(page.locator('.agenda-entry')).toHaveCount(1);
  await expect(page.locator('.agenda-row')).toContainText('09:00');
  await expect(page.locator('.agenda-row')).toContainText(
    'Meet afterward for coffee',
  );
  await expect(page.locator('.agenda-row')).toContainText('Naniwa Bridge');
  await expect(page.locator('.agenda-row')).not.toContainText('07:00');
  await page.screenshot({ path: info.outputPath('compact-my-day.png') });
  await page.locator('[data-action=agenda-view][data-id=map]').click();
  await expect(page.locator('.agenda-map iframe')).toHaveAttribute(
    'src',
    /Naniwa%20Bridge/,
  );
  await page.screenshot({ path: info.outputPath('compact-meeting-map.png') });
  await page.locator('.agenda-scope [data-id=group]').click();
  await expect(page.locator('#agenda-map-plan option')).toHaveCount(2);
  await expect(page.locator('.agenda-date-picker')).toContainText('4 Oct');
  await page.locator('[data-action=agenda-step][data-id="1"]').click();
  await expect(page.locator('.agenda-date-picker')).toContainText('5 Oct');
  await expect(page.locator('#agenda-map-plan option')).toHaveCount(1);
  await expect(page.locator('.agenda-map')).toContainText('Namba Station');
  await page.locator('[data-action=agenda-view][data-id=list]').click();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await nav(page, 'discover');
  await nav(page, 'day');
  await expect(page.locator('.agenda-date-picker')).toContainText('5 Oct');
});

test('four real synthetic invitations fit the compact phone agenda without a hero', async ({
  page,
  runtime,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Example Host');
  await page.locator('#f-title').fill('Synthetic compact trip');
  await page.locator('#auth-form button[type=submit]').click();
  await expect(page.locator('.phone-agenda')).toBeVisible();
  const state = await (
    await page.request.get(runtime.url + '/api/state')
  ).json();
  for (const [i, title] of [
    'Morning walk',
    'A small gallery',
    'Lunch together',
    'Coffee by the river',
  ].entries()) {
    const start = String(8 + i * 2).padStart(2, '0') + ':00';
    const end = String(9 + i * 2).padStart(2, '0') + ':00';
    const response = await page.request.post(runtime.url + '/api/plans', {
      headers: { 'X-Omakase': '1' },
      data: {
        requestId: crypto.randomUUID(),
        title,
        region: 'osaka',
        area: 'Synthetic neighbourhood',
        date: state.trip.start,
        start,
        end,
        meeting: 'Synthetic public entrance',
        description: 'Synthetic test invitation. Nothing booked.',
        kind: 'idea',
        booking: 'check',
        joinStyle: 'open',
        effort: 'easy',
        cost: '',
        capacity: null,
        mapLink: '',
        catalogueId: ['osaka-013', 'osaka-011', 'osaka-005', 'tokyo-028'][i],
        segments: [],
      },
    });
    expect(response.ok()).toBe(true);
  }
  await page.reload();
  await expect(page.locator('.agenda-entry')).toHaveCount(4);
  const last = await page.locator('.agenda-entry').last().boundingBox();
  const dock = await page.locator('.nav-dock').boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(dock.y);
  await expect(page.locator('.trip-home')).toHaveCount(0);
  await expect(page.locator('.agenda-row')).toHaveCount(4);
  await page.screenshot({ path: info.outputPath('compact-four-plans.png') });
});
