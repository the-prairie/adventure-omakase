import { test, expect, TEST_KEY } from './runtime.mjs';
import { readFile } from 'node:fs/promises';
const action = (page, name) =>
  page.locator(`[data-action="${name}"]:visible`).first();
const state = async (page) => (await page.request.get('/api/state')).json();
async function close(page) {
  if (await page.locator('#dialog').isVisible())
    await page.keyboard.press('Escape');
}
async function openCollection(page, id) {
  await close(page);
  await page.locator('[data-nav=discover]:visible').first().click();
  const entry = page.locator(`[data-collection-id="${id}"]`);
  if (!(await entry.getAttribute('open')))
    await entry.locator('summary').click();
  await entry.locator('[data-action=plan-collection]').click();
  await expect(page.locator('#outing-planner')).toBeVisible();
}
async function meeting(page, id, value) {
  const row = page.locator(`[data-outing-stop="${id}"]`);
  await row.locator('.outing-meeting summary').click();
  await row.locator('[data-stop-field=meeting]').fill(value);
}
async function publish(page) {
  await page.locator('[data-outing=review]').click();
  if (await page.locator('[data-outing-error]').count()) {
    const error = await page.locator('[data-outing-error]').innerText();
    if (error) throw new Error('Outing review failed: ' + error);
  }
  await expect(page.locator('#dialog-title')).toHaveText('Review your outing');
  await page.locator('#plan-form button[type=submit]').click();
  await expect(page.locator('.host-actions')).toBeVisible();
}

test('a curated Naha evening becomes a shared plan, a friend joins dinner only, and host changes require reconfirmation', async ({
  browser,
  runtime,
}, info) => {
  const ownerContext = await browser.newContext({
    baseURL: runtime.url,
    viewport: { width: 1440, height: 1000 },
  });
  const friendContext = await browser.newContext({
    baseURL: runtime.url,
    viewport: { width: 390, height: 844 },
  });
  const owner = await ownerContext.newPage(),
    friend = await friendContext.newPage();
  owner.setDefaultTimeout(15000);
  friend.setDefaultTimeout(15000);
  try {
    await owner.goto(runtime.url + '/#setup=' + TEST_KEY);
    await owner.locator('#f-name').fill('Example Host');
    await owner.locator('#f-title').fill('Synthetic outing acceptance');
    await owner.locator('#auth-form button[type=submit]').click();
    await action(owner, 'invite').click();
    const invitation = await owner.locator('#invite-url').inputValue();
    await friend.goto(invitation);
    await friend.locator('#f-name').fill('Example Friend');
    await friend.locator('#auth-form button[type=submit]').click();
    await expect(
      friend.locator('[data-nav=people]:visible').first(),
    ).toBeVisible();

    await openCollection(owner, 'naha-sakaemachi-evening');
    await owner.locator('#outing-date').fill('2026-10-06');
    await owner.locator('#outing-title').fill('Dinner and a little wandering');
    await owner.locator('#outing-minutes-okinawa-042').fill('60');
    await owner.locator('#outing-minutes-okinawa-010').fill('45');
    await owner.locator('#outing-gap-okinawa-010').fill('20');
    await meeting(owner, 'okinawa-042', 'Synthetic Urizun public entrance');
    await meeting(owner, 'okinawa-010', 'Synthetic Sakaemachi meeting corner');
    await owner
      .locator('#outing-fallback')
      .fill('If tired, finish after dinner.');
    await expect(owner.locator('[data-outing-preview]')).toContainText(
      '18:00–20:05',
    );
    expect((await state(owner)).plans).toHaveLength(0);
    expect((await state(friend)).plans).toHaveLength(0);
    await publish(owner);
    const current = await state(owner),
      plan = current.plans[0];
    expect(current.plans).toHaveLength(1);
    expect(plan.catalogueId).toBe('');
    expect(plan.segments.map((part) => part.start)).toEqual(['18:00', '19:20']);
    expect(plan.description).toContain('If tired, finish after dinner.');
    await expect(
      owner.locator('.plan-notes a[href*="tabelog.com"]'),
    ).toBeVisible();
    await owner.screenshot({
      path: info.outputPath('published-outing-desktop.png'),
    });

    await friend.goto(runtime.url + '/#plan=' + plan.id);
    await expect(friend.locator('#rsvp-form')).toBeVisible();
    await friend
      .locator('input[name=choice][value="outing-okinawa-042"]')
      .check();
    await friend.locator('#rsvp-form button[value=joined]').click();
    await expect(friend.locator('#rsvp-form')).toContainText('Update my part');
    let friendPlan = (await state(friend)).plans.find(
      (item) => item.id === plan.id,
    );
    const friendId = (await state(friend)).me.id;
    expect(friendPlan.rsvps.find((r) => r.memberId === friendId).choice).toBe(
      'outing-okinawa-042',
    );
    await friend.screenshot({
      path: info.outputPath('join-dinner-mobile.png'),
    });

    const downloadPromise = owner.waitForEvent('download', { timeout: 15000 });
    await action(owner, 'download-day-sheet').click();
    const download = await downloadPromise;
    const html = await readFile(await download.path(), 'utf8');
    expect(html).toContain('Synthetic Urizun public entrance');
    expect(html).toContain('This copy will not update');
    expect(html).not.toContain('Example Friend');
    expect(html).not.toContain('#join=');
    const offlineContext = await browser.newContext({
      offline: true,
      viewport: { width: 390, height: 844 },
    });
    try {
      const sheet = await offlineContext.newPage();
      await sheet.setContent(html);
      await expect(
        sheet.getByRole('heading', { name: 'Dinner and a little wandering' }),
      ).toBeVisible();
      await expect(sheet.locator('body')).toContainText(
        'Synthetic Sakaemachi meeting corner',
      );
      await sheet.screenshot({
        path: info.outputPath('offline-day-sheet-mobile.png'),
      });
    } finally {
      await offlineContext.close();
    }

    await action(owner, 'plan-edit').click();
    await owner.locator('.plan-extra > summary').click();
    await owner
      .locator('[data-segment="outing-okinawa-042"] [data-seg=meeting]')
      .fill('Synthetic revised dinner entrance');
    await owner.locator('#plan-form button[type=submit]').click();
    await expect(owner.locator('.host-actions')).toBeVisible();
    await friend.reload();
    await expect(friend.locator('#dialog')).toContainText(
      'This changed since you joined',
    );
    await expect(friend.locator('#dialog')).toContainText(
      'Synthetic revised dinner entrance',
    );
    await friend.locator('#rsvp-form button[value=joined]').click();
    await expect(friend.locator('#rsvp-form')).toContainText('Update my part');
    friendPlan = (await state(friend)).plans.find(
      (item) => item.id === plan.id,
    );
    expect(
      friendPlan.rsvps.find((r) => r.memberId === friendId).acceptedRevision,
    ).toBe(friendPlan.revision);

    // A second concrete day uses the same flow for an Osaka afternoon.
    await openCollection(owner, 'osaka-river-and-cake');
    await owner.locator('#outing-date').fill('2026-10-03');
    await owner.locator('#outing-start').fill('14:00');
    const rows = owner.locator('[data-outing-stop]');
    for (let i = 0; i < (await rows.count()); i++) {
      await rows.nth(i).locator('.outing-meeting summary').click();
      await rows
        .nth(i)
        .locator('[data-stop-field=meeting]')
        .fill(`Synthetic Osaka public meeting ${i + 1}`);
    }
    await publish(owner);
    const osaka = (await state(owner)).plans.find(
      (item) => item.region === 'osaka',
    );
    expect(osaka.segments).toHaveLength(2);
    expect(osaka.start).toBe('14:00');
    expect(osaka.booking).toBe('check');
    expect(osaka.description).toContain('Fieldbook sources');
  } finally {
    await ownerContext.close();
    await friendContext.close();
  }
});

test('the day editor preserves a private draft, supports removal and reordering, and prevents impossible schedules', async ({
  page,
  runtime,
}, info) => {
  await page.goto(runtime.url + '/example.html#demo/discover');
  await openCollection(page, 'naha-sakaemachi-evening');
  await page.locator('#outing-title').fill('An unhurried evening');
  await page.locator('#outing-minutes-okinawa-042').fill('60');
  await page.locator('#outing-minutes-okinawa-010').fill('45');
  await page.locator('#outing-gap-okinawa-010').fill('20');
  await page.locator('#outing-finish').fill('19:00');
  await expect(page.locator('[data-outing-preview]')).toContainText(
    'later than you wanted',
  );
  await expect(page.locator('[data-outing=review]')).toBeDisabled();
  await page.locator('#outing-finish').fill('');
  await page.locator('[data-outing=later][data-stop-id=okinawa-042]').click();
  await expect(page.locator('[data-outing-stop]').first()).toHaveAttribute(
    'data-outing-stop',
    'okinawa-010',
  );
  await page
    .getByRole('checkbox', { name: 'Include Sakaemachi Market evening' })
    .uncheck();
  await expect(page.locator('[data-outing-preview]')).toContainText('1 stop');
  await expect(page.locator('[data-outing-preview]')).toContainText(
    '18:00–19:00',
  );
  await close(page);
  await page.reload();
  await openCollection(page, 'naha-sakaemachi-evening');
  await expect(page.locator('#outing-title')).toHaveValue(
    'An unhurried evening',
  );
  await expect(
    page.getByRole('checkbox', { name: 'Include Sakaemachi Market evening' }),
  ).not.toBeChecked();
  await page
    .getByRole('checkbox', { name: 'Include Sakaemachi Market evening' })
    .check();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#dialog').evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await page.screenshot({ path: info.outputPath('outing-editor-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#dialog').evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await page.screenshot({ path: info.outputPath('outing-editor-mobile.png') });
  expect(
    await page
      .locator('#dialog')
      .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  ).toBe(true);
  await page.locator('[data-outing-stop]').last().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('outing-editor-mobile-stops.png'),
  });
  await page.locator('#outing-start').fill('23:45');
  await expect(page.locator('[data-outing-preview]')).toContainText('next day');
  await expect(page.locator('[data-outing=review]')).toBeDisabled();
  await close(page);
  await openCollection(page, 'yaeyama-village-and-bay');
  await expect(page.locator('#outing-planner')).toContainText(
    'Start with one day',
  );
  await expect(page.locator('[data-stop-field=included]:checked')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-outing-preview]')).toContainText('1 stop');
});
