import { test, expect, TEST_KEY } from './runtime.mjs';

const headers = (url) => ({ Origin: url, 'X-Omakase': '1' });
const api = async (page, url, path, data) => {
  const response =
    data === undefined
      ? await page.request.get(url + '/api' + path)
      : await page.request.post(url + '/api' + path, {
          headers: headers(url),
          data,
        });
  expect(response.ok(), await response.text()).toBe(true);
  return response.status() === 204 ? null : response.json();
};
const close = (page) =>
  page.locator('dialog [data-action=close]').first().click();
async function choose(page, label, name) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name, exact: true }).click();
}

test('phone planning preserves source, solo boundaries, explicit replies and accepted changes', async ({
  browser,
  runtime,
}, info) => {
  const hc = await browser.newContext({
    viewport: { width: 393, height: 720 },
    reducedMotion: 'reduce',
  });
  const gc = await browser.newContext({
    viewport: { width: 393, height: 720 },
    reducedMotion: 'reduce',
  });
  const host = await hc.newPage(),
    guest = await gc.newPage();
  const errors = [];
  host.on('pageerror', (e) => errors.push(e.message));
  guest.on('pageerror', (e) => errors.push(e.message));
  try {
    const created = await api(host, runtime.url, '/trips', {
      name: 'Ariel',
      title: 'Synthetic intent checks',
      hostKey: TEST_KEY,
    });
    const invite = await api(host, runtime.url, '/invite');
    await api(guest, runtime.url, '/join', {
      name: 'Claire',
      token: invite.token,
    });
    await host.goto(runtime.url + '/#day');
    await host.locator('[data-action=plan-new]:visible').first().click();
    await host.locator('#f-title').fill('A quiet afternoon');
    await host.locator('#f-area').fill('Kitahama');
    await choose(host, 'Region', 'Osaka & beyond');
    const source = (await api(host, runtime.url, '/catalogue?id=osaka-001'))
      .places[0];
    await host
      .locator('#f-catalogueSource')
      .fill(source.title + ' · ' + source.id);
    await choose(host, 'How can friends join?', 'Just me · a shared heads-up');
    await host.locator('#f-meeting').fill('Synthetic library entrance');
    await host.locator('#f-costLimit').fill('0');
    await host.screenshot({
      path: info.outputPath('intent-form-limit-mobile.png'),
    });
    await host.locator('#f-title').scrollIntoViewIfNeeded();
    await host.screenshot({
      path: info.outputPath('intent-form-source-mobile.png'),
    });
    await host.locator('#plan-form [type=submit]').click();
    await expect(host.locator('.solo-heads-up, .host-actions')).toContainText(
      'shared heads-up',
    );
    let plan = (await api(host, runtime.url, '/state')).plans[0];
    expect(plan.catalogueId).toBe('osaka-001');
    expect(plan.costLimit).toBe(0);
    await guest.goto(runtime.url + '/#plan=' + plan.id);
    await expect(guest.locator('.solo-heads-up')).toBeVisible();
    await expect(guest.locator('#rsvp-form')).toHaveCount(0);
    await guest.screenshot({
      path: info.outputPath('solo-heads-up-mobile.png'),
    });
    await close(host);
    await host.locator('[data-action=plan-new]:visible').first().click();
    await host.locator('#f-title').fill('An optional dinner');
    await host.locator('#f-area').fill('Kitahama');
    await choose(host, 'Region', 'Osaka & beyond');
    await host.locator('#f-meeting').fill('Synthetic cafe west entrance');
    await host.locator('#f-costLimit').fill('1500');
    await host.locator('#plan-form [type=submit]').click();
    plan = (await api(host, runtime.url, '/state')).plans.find(
      (p) => p.title === 'An optional dinner',
    );
    await guest.goto(runtime.url + '/#plan=' + plan.id);
    await expect(guest.locator('.plan-terms')).toContainText(
      '¥1,500 per person',
    );
    await guest.locator('#rsvp-form [value=declined]').click();
    await expect(guest.locator('#rsvp-form')).toContainText(
      'You’re sitting this out',
    );
    let observed = await api(guest, runtime.url, '/context?date=' + plan.date);
    expect(observed.plans.find((p) => p.id === plan.id).response).toBe(
      'declined',
    );
    await guest.screenshot({ path: info.outputPath('decline-mobile.png') });
    await guest.locator('.reply-adjust summary').click();
    await guest.locator('#rsvp-form [value=joined]').click();
    await expect(guest.locator('#rsvp-form [value=joined]')).toContainText(
      'Update my part',
    );
    await host.locator('[data-action=plan-edit]').click();
    await host.locator('#f-meeting').fill('Synthetic cafe east entrance');
    await host.locator('#f-costLimit').fill('2000');
    await host.locator('#plan-form [type=submit]').click();
    await expect(host.locator('.meeting-box')).toContainText('east entrance');
    await guest.reload();
    await expect(guest.locator('.plan-reconfirmation')).toContainText(
      'Previously: Synthetic cafe west entrance',
    );
    await expect(guest.locator('.plan-reconfirmation')).toContainText(
      'Now: Synthetic cafe east entrance',
    );
    await expect(guest.locator('.plan-reconfirmation')).toContainText(
      'Previously: ¥1,500',
    );
    await guest.screenshot({ path: info.outputPath('reconfirm-mobile.png') });
    await guest.setViewportSize({ width: 1280, height: 900 });
    await guest.screenshot({ path: info.outputPath('reconfirm-desktop.png') });
    await guest.locator('#rsvp-form [value=joined]').click();
    await expect(guest.locator('.plan-reconfirmation')).toHaveCount(0);
    observed = await api(guest, runtime.url, '/context?date=' + plan.date);
    expect(
      observed.plans.find((p) => p.id === plan.id).accepted.costLimit,
    ).toBe(2000);
    const current = (await api(host, runtime.url, '/state')).plans.find(
      (p) => p.id === plan.id,
    );
    const revised = await host.request.put(
      runtime.url + '/api/plans/' + plan.id,
      {
        headers: headers(runtime.url),
        data: {
          ...current,
          kind: 'idea',
          joinStyle: 'reunion',
          booking: 'host-booked',
          segments: [
            {
              id: 'dinner',
              label: 'Dinner only',
              start: current.start,
              end: current.end,
              meeting: current.meeting,
            },
          ],
        },
      },
    );
    expect(revised.ok(), await revised.text()).toBe(true);
    await guest.setViewportSize({ width: 393, height: 720 });
    await guest.reload();
    await expect(guest.locator('.plan-reconfirmation')).toContainText(
      'Now: An idea · not yet decided',
    );
    await expect(guest.locator('.plan-reconfirmation')).toContainText(
      'Now: Solo first · meet afterward only',
    );
    await expect(guest.locator('.plan-reconfirmation')).toContainText(
      'Now: Host has booked for themselves',
    );
    await guest.screenshot({
      path: info.outputPath('reconfirm-labels-mobile.png'),
    });
    await guest.setViewportSize({ width: 1280, height: 900 });
    await guest.screenshot({
      path: info.outputPath('reconfirm-labels-desktop.png'),
    });
    expect(created.me.name).toBe('Ariel');
    expect(errors).toEqual([]);
  } finally {
    await hc.close();
    await gc.close();
  }
});
