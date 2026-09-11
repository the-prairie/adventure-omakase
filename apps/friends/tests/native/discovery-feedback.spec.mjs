import { test, expect } from './runtime.mjs';
const action = (page, name) =>
  page.locator(`[data-action="${name}"]:visible`).first();

test('discoveries have distinct credited photos, prominent moods and a findable private shortlist', async ({
  page,
  runtime,
}, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 973, height: 1100 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  const results = page.locator('#discovery-results');
  await expect(page.locator('#search')).toBeVisible();
  await expect(
    page.locator('[data-action=discovery-library][data-id=saved]'),
  ).toContainText('Saved');
  const photos = page.locator('.discovery-grid .experience-photo img');
  expect(await photos.count()).toBeGreaterThan(15);
  const urls = await photos.evaluateAll((imgs) => imgs.map((img) => img.src));
  expect(new Set(urls).size).toBeGreaterThan(15);
  await expect(page.locator('.discovery-grid .text-place')).toHaveCount(0);
  await expect(page.locator('.discovery-grid')).not.toContainText(
    'Imagined scene',
  );
  await expect(
    page.locator('.discovery-grid .experience-photo figcaption').first(),
  ).toContainText('CC BY-SA');
  await results.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('discovery-photos-desktop.png'),
  });
  await page.locator('#search').fill('Reversible Destiny');
  await page.locator('[data-action=save][data-id="tokyo-007"]').click();
  await expect(page.locator('#toast')).toContainText(
    'Saved to your private places',
  );
  await page.locator('#toast [data-action=view-saved]').click();
  await expect(
    page.locator('[data-action=discovery-library][data-id=saved]'),
  ).toHaveClass('active');
  await expect(results).toContainText('Reversible Destiny');
  await page.reload();
  await page.locator('[data-action=discovery-library][data-id=saved]').click();
  await expect(results).toContainText('Reversible Destiny');
  await page.locator('.discovery-grid [data-action=discovery]').first().click();
  await expect(page.locator('[data-action=recommend]')).toContainText(
    'Recommend to the group',
  );
  await expect(page.locator('#dialog [data-action=view-saved]')).toBeVisible();
  await page.locator('#dialog [data-action=view-saved]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('saved-mobile.png') });
  await page.locator('[data-action=discovery-library][data-id=all]').click();
  await page.locator('.places-stories > summary').click();
  await action(page, 'dice').click();
  await expect(page.locator('#dice-form')).toBeVisible();
  expect(errors).toEqual([]);
});

test('experience guides carry into invitations with on-demand maps and quick exact timing', async ({
  page,
  runtime,
}, info) => {
  const queries = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://maps.google.com/maps?*', async (route) => {
    queries.push(new URL(route.request().url()).searchParams.get('q'));
    await route.fulfill({
      contentType: 'text/html',
      body: '<main>Google map fixture for a synthetic browser test</main>',
    });
  });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page
    .locator('[data-action=discovery][data-id="tokyo-001"]')
    .first()
    .click();
  await expect(page.locator('.experience-context')).toContainText(
    'working flood-control system',
  );
  await expect(page.locator('.experience-context a')).toHaveAttribute(
    'href',
    'https://saitama-supportdesk.com/experiences/post-24362/',
  );
  await expect(page.locator('#dialog iframe')).toHaveCount(0);
  await expect(page.locator('.place-quick-actions a').first()).toHaveAttribute(
    'href',
    /maps\/search/,
  );
  expect(queries).toEqual([]);
  await action(page, 'close').click();
  await page.locator('#search').fill('Shimokitazawa thrift');
  await page.locator('.discovery-grid [data-action=discovery]').first().click();
  await expect(page.locator('.experience-context')).toContainText(
    'vintage clothing',
  );
  await action(page, 'plan-from').click();
  await expect(page.locator('#f-description')).toHaveValue(
    /unhurried afternoon/,
  );
  await page.locator('.trip-day-picker > summary').click();
  await page.locator('[data-action=plan-day][data-id="2026-10-05"]').click();
  await expect(page.locator('#f-date')).toHaveValue('2026-10-05');
  await expect(page.locator('#plan-day-label')).toContainText('Monday');
  await page.locator('[data-action=plan-start][data-id="14:00"]').click();
  await page.locator('[data-action=plan-duration][data-id="60"]').click();
  await expect(page.locator('#f-start')).toHaveValue('14:00');
  await expect(page.locator('#f-end')).toHaveValue('15:00');
  await page.locator('#f-start').fill('23:45');
  await page.locator('[data-action=plan-duration][data-id="30"]').click();
  await expect(page.locator('#toast')).toContainText('next day');
  await expect(page.locator('#f-end')).toHaveValue('15:00');
  await page.locator('#f-start').fill('14:00');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.plan-timing').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('timing-mobile.png') });
  await page.locator('#f-meeting').fill('meet at location');
  await page.locator('#plan-form [type=submit]').click();
  await expect(page.locator('.plan-view .experience-context')).toContainText(
    'vintage clothing',
  );
  await page.locator('.plan-background > summary').click();
  await expect(
    page.getByRole('heading', { name: 'What the outing is' }),
  ).toBeVisible();
  await expect(page.locator('.plan-view .experience-photo img')).toBeVisible();
  await expect(page.locator('.meeting-box')).toContainText('area only');
  await page.locator('.plan-map-details > summary').click();
  await page.locator('.meeting-box iframe').scrollIntoViewIfNeeded();
  // WebKit may reload the same meeting iframe while layout settles.
  await expect.poll(() => queries.length).toBeGreaterThanOrEqual(1);
  expect(queries.at(-1)).not.toContain('meet at location');
  expect(queries.at(-1)).toContain('Shimokitazawa');
  const manage = page.locator('.plan-management');
  await manage.scrollIntoViewIfNeeded();
  for (const name of ['plan-complete', 'plan-cancel']) {
    const b = page.locator(`[data-action=${name}]`);
    const metrics = await b.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      padding: parseFloat(getComputedStyle(el).paddingLeft),
      overflow: el.scrollWidth > el.clientWidth,
    }));
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    expect(metrics.padding).toBeGreaterThanOrEqual(16);
    expect(metrics.overflow).toBe(false);
  }
  await page.screenshot({ path: info.outputPath('host-actions-mobile.png') });
  await page.locator('#dialog').evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({
    path: info.outputPath('experience-plan-mobile.png'),
  });
  await action(page, 'plan-edit').click();
  await expect(page.locator('#f-date')).toHaveValue('2026-10-05');
  await expect(page.locator('#f-start')).toHaveValue('14:00');
  await expect(page.locator('#f-end')).toHaveValue('15:00');
  expect(errors).toEqual([]);
});

test('Osaka and Okinawa guides pair real photographs with useful planning context', async ({
  page,
  runtime,
}, info) => {
  await page.route('https://maps.google.com/maps?*', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<main>Map fixture</main>',
    }),
  );
  await page.goto(runtime.url + '/example.html#demo/discover');
  for (const [query, id, phrase, credit] of [
    ['Namba Yasaka', 'osaka-002', 'ceremonial stage', 'Lion-head stage'],
    ['Gangala', 'okinawa-011', 'guided tour only', 'Banyan roots'],
    ['Hamabe', 'okinawa-043', 'arrival order', 'low tide'],
  ]) {
    await page.locator('#search').fill(query);
    await page
      .locator(`[data-action=discovery][data-id="${id}"]`)
      .first()
      .click();
    await expect(page.locator('#dialog .experience-context')).toContainText(
      phrase,
    );
    const photo = page.locator('#dialog .experience-photo img');
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((img) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    await expect(page.locator('#dialog figcaption')).toContainText(credit);
    await expect(
      page.locator('#dialog .experience-context a').last(),
    ).toHaveAttribute('href', /^https:\/\//);
    if (id === 'okinawa-011') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: info.outputPath('gangala-guide-mobile.png'),
      });
      await action(page, 'plan-from').click();
      await expect(page.locator('#f-description')).toHaveValue(
        /Gangala’s guided route/,
      );
      await action(page, 'close').click();
    } else {
      await page.screenshot({ path: info.outputPath(`${id}-guide.png`) });
      await action(page, 'close').click();
    }
  }
});
