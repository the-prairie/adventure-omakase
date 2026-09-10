import { test, expect, TEST_KEY } from './runtime.mjs';
test.use({ companionFixture: true });
const action = (p, a) => p.locator(`[data-action="${a}"]:visible`).first();
async function state(p) {
  return p.evaluate(() => fetch('/api/state').then((r) => r.json()));
}
async function join(p, url, name) {
  await p.goto(url);
  await p.locator('#f-name').fill(name);
  await p.locator('#auth-form [type=submit]').click();
  await expect(p.locator('[data-nav=people]:visible').first()).toBeVisible();
}
async function close(p) {
  await p.keyboard.press('Escape');
}

test('fixture AI cards confirm an ordinary invitation with lunch-only participation', async ({
  browser,
  runtime,
}, info) => {
  const contexts = [];
  async function page(width) {
    const c = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId: 'Asia/Tokyo',
    });
    contexts.push(c);
    const p = await c.newPage();
    await p.clock.setFixedTime(new Date('2026-09-27T09:00:00+09:00'));
    return p;
  }
  const a = await page(1440),
    b = await page(390),
    c = await page(390);
  try {
    await a.goto(runtime.url + '/#setup=' + TEST_KEY);
    await a.locator('#f-name').fill('Synthetic A');
    await a.locator('#auth-form [type=submit]').click();
    await expect(a.locator('[data-nav=people]:visible').first()).toBeVisible();
    await action(a, 'invite').click();
    const link = await a.locator('#invite-url').inputValue();
    await close(a);
    await join(b, link, 'Synthetic B');
    await join(c, link, 'Synthetic C');
    await action(c, 'profile').click();
    await action(c, 'add-window').click();
    await c.locator('[data-w=region]').selectOption('tokyo');
    await c.locator('[data-w=area]').fill('Ueno');
    await c.locator('[data-w=from]').fill('2026-09-26');
    await c.locator('[data-w=to]').fill('2026-10-14');
    await c.locator('#profile-form [type=submit]').click();
    await a.reload();
    await action(a, 'discover-nav').click();
    await action(a, 'ask-find').click();
    await a
      .locator('#ask-prompt')
      .fill(
        'I’m in Osaka tomorrow. I want something unusual for a couple of hours, then a good lunch. I’m going either way; friends can join whichever part they like.',
      );
    await expect(a.locator('#ask-date')).toHaveValue('2026-09-28');
    await a.locator('#ask-area').fill('Namba');
    await a.screenshot({
      path: info.outputPath('ask-request-desktop.png'),
      fullPage: true,
    });
    await a.locator('#ask-form [type=submit]').click();
    await expect(a.locator('.ask-option')).toHaveCount(2);
    await expect(a.locator('#dialog')).toContainText(
      /Monday,? 28 September 2026/,
    );
    await a.screenshot({
      path: info.outputPath('ask-fixture-options-desktop.png'),
      fullPage: true,
    });
    await a.locator('[data-ask=draft]').first().click();
    await expect(a.locator('[data-ask-part]')).toHaveCount(2);
    await expect(a.locator('#ask-kind')).toHaveValue('going');
    await a.locator('#ask-confirm-form [type=submit]').click();
    await expect(a.locator('#dialog')).toContainText(
      'Synthetic Osaka activity and lunch',
    );

    const p = (await state(a)).plans[0];
    await b.goto(runtime.url + '/#plan=' + p.id);
    await expect(b.locator('[name=choice][value=part-2]')).toBeVisible();
    await b.screenshot({
      path: info.outputPath('join-part-mobile.png'),
      fullPage: true,
    });
    await b.locator('[name=choice][value=part-2]').check();
    await b.locator('#rsvp-form [value=joined]').click();
    await expect(b.locator('#dialog')).toContainText('Update my part');
    await close(b);
    await b.locator('[data-nav=day]:visible').first().click();
    await b.locator('.agenda-date-picker > summary').click();
    await b.locator('[data-action=day][data-id="2026-09-28"]').click();
    await expect(b.locator('#main')).toContainText(/12:30\s*–13:30/);
    await expect(b.locator('#main')).toContainText(
      'Synthetic lunch front door',
    );
    await b.screenshot({
      path: info.outputPath('ask-fixture-lunch-mobile.png'),
      fullPage: true,
    });
    const cState = await state(c);
    expect(cState.plans[0].rsvps.some((r) => r.memberId === cState.me.id)).toBe(
      false,
    );
    await action(a, 'plan-edit').click();
    await a.locator('.plan-extra > summary').click();
    await a
      .locator('[data-segment=part-2] [data-seg=meeting]')
      .fill('New lunch entrance');
    await a.locator('#plan-form [type=submit]').click();
    await b.reload();
    await b.goto(runtime.url + '/#plan=' + p.id);
    await expect(b.locator('#dialog')).toContainText('Reconfirm my part');
  } finally {
    for (const c of contexts) await c.close();
  }
});

test('fixture UI keeps cancellation and offline confirmation honest', async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Cancel test');
  await page.locator('#auth-form [type=submit]').click();
  await action(page, 'discover-nav').click();
  await action(page, 'ask-find').click();
  await page.locator('#ask-area').fill('Umeda');
  await page.locator('#ask-date').fill('2026-10-03');
  await page.locator('#ask-start').fill('11:00');
  await page.locator('.ask-timing summary').click();
  await expect(page.locator('.ask-timing summary')).toContainText(
    '3 October 2026',
  );
  await expect(page.locator('.ask-timing summary')).toContainText(
    'Umeda · 11:00–14:00 JST',
  );
  await page.locator('#ask-form [type=submit]').click();
  await page.locator('[data-ask=cancel]').click();
  await expect(page.locator('#dialog')).toContainText('Cancelled');
  expect((await state(page)).plans).toEqual([]);
  await page.locator('[data-ask=retry]').click();
  await page.context().setOffline(true);
  await page.locator('#ask-form [type=submit]').click();
  await expect(page.locator('.form-error')).toContainText('offline');
  await page.context().setOffline(false);
});

test('travel helpers show results, recover private drafts and require memory review', async ({
  page,
  runtime,
}, info) => {
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Synthetic helper tester');
  await page.locator('#auth-form [type=submit]').click();
  const open = async (kind) => {
    await close(page);
    await action(page, 'companion').click();
    await page
      .locator(`[data-travel=open][data-value=${kind}]:visible`)
      .click();
  };
  await open('translate');
  await page.locator('#travel-text').fill('今日は散歩しました。');
  await page.locator('#travel-form [type=submit]').click();
  await expect(page.locator('.translation-pair')).toContainText(
    'I went for a walk today.',
  );
  await expect(page.locator('.translation-pair')).toContainText(
    '今日は散歩しました。',
  );
  await page.screenshot({
    path: info.outputPath('translation-fixture.png'),
    fullPage: true,
  });
  expect((await state(page)).moments).toHaveLength(0);
  await close(page);
  await open('translate');
  await page.locator('[data-travel=history]').click();
  await page.locator('[data-travel=history-open]').first().click();
  await expect(page.locator('.translation-pair')).toContainText(
    'I went for a walk today.',
  );
  await close(page);
  await open('memory');
  await page.locator('#travel-text').fill('We tested the fieldbook together.');
  await page.locator('#travel-form [type=submit]').click();
  await expect(page.locator('.translation-pair')).toContainText(
    'We tested the fieldbook together.',
  );
  await page.locator('[data-travel=memory-draft]').click();
  await expect(page.locator('#moment-form')).toBeVisible();
  expect((await state(page)).moments).toHaveLength(0);
  await close(page);
  await open('places');
  await page.locator('#travel-form [type=submit]').click();
  await expect(page.locator('#dialog')).toContainText('Synthetic venue');
  await expect(page.locator('.maps-attribution')).toBeVisible();
  await page.locator('[data-travel=place-route]').click();
  await page.locator('#travel-form [type=submit]').click();
  await expect(page.locator('#dialog')).toContainText('10 minutes');
  await expect(
    page.locator('a', { hasText: 'Open route in Google Maps' }),
  ).toHaveAttribute('href', /travelmode=walking/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath('route-fixture-mobile.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
