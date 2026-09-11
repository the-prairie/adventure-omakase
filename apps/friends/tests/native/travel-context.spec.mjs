import { test, expect, TEST_KEY } from './runtime.mjs';

test('travel tools use the selected day and leave missing or ambiguous locations for the traveler', async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Synthetic context traveler');
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('[data-nav=people]:visible').first()).toBeVisible();
  const tokyo = {
    region: 'tokyo',
    area: 'Yanaka, Tokyo',
    from: '2026-09-26',
    to: '2026-09-30',
  };
  const osaka = {
    region: 'osaka',
    area: 'Kitahama, Osaka',
    from: '2026-10-01',
    to: '2026-10-08',
  };
  for (const { windows, expected } of [
    { windows: [], expected: '' },
    { windows: [tokyo, osaka], expected: 'Kitahama, Osaka' },
    { windows: [tokyo], expected: '' },
    { windows: [osaka, { ...osaka, area: 'Namba, Osaka' }], expected: '' },
    { windows: [osaka, { ...osaka, area: '' }], expected: '' },
    {
      windows: [
        { ...osaka, area: 'City centre' },
        { ...osaka, region: 'tokyo', area: 'City centre' },
      ],
      expected: '',
    },
  ]) {
    const response = await page.evaluate(async (windows) => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Omakase': '1' },
        body: JSON.stringify({
          name: 'Synthetic context traveler',
          bio: '',
          interests: '',
          windows,
        }),
      });
      return response.status;
    }, windows);
    expect(response).toBe(200);
    await page.reload();
    await page.locator('[data-nav=people]:visible').first().click();
    await page.getByRole('combobox', { name: 'Day', exact: true }).click();
    await page.getByRole('option', { name: 'Sun 4 Oct', exact: true }).click();
    await page.locator('[data-action=companion]:visible').first().click();
    await page.locator('[data-travel=open][data-value=route]').click();
    await expect(page.locator('#travel-origin')).toHaveValue(expected);
    await expect(page.locator('#travel-destination')).toHaveValue('');
    await page
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
    await page.locator('[data-action=companion]:visible').first().click();
    await page.locator('[data-travel=open][data-value=places]').click();
    await expect(page.locator('#travel-query')).toHaveValue(
      expected ? 'Lunch near ' + expected : '',
    );
    await page
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
  }
});
