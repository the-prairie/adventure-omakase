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
  const envelopes = page.locator('.envelopes'),
    results = page.locator('#discovery-results');
  expect(
    await envelopes.evaluate(
      (el) =>
        !!(
          el.compareDocumentPosition(
            document.querySelector('#discovery-results'),
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await expect(
    page.locator('[data-action=discovery-library][data-id=saved]'),
  ).toContainText('Saved');
  const photos = page.locator('.discovery-grid .experience-photo img');
  expect(await photos.count()).toBeGreaterThan(15);
  const urls = await photos.evaluateAll((imgs) => imgs.map((img) => img.src));
  expect(new Set(urls).size).toBe(urls.length);
  await expect(page.locator('.discovery-grid')).not.toContainText(
    'Imagined scene',
  );
  await expect(
    page.locator('.experience-photo figcaption').first(),
  ).toContainText('CC BY-SA');
  await results.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('discovery-photos-desktop.png'),
  });
  await page.locator('#search').fill('Reversible Destiny');
  await page.locator('[data-action=save][data-id="tokyo-007"]').click();
  await expect(page.locator('#toast')).toContainText('private shortlist');
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
  await action(page, 'envelope').click();
  await expect(page.locator('#dice-mood')).toHaveValue('Strange');
  expect(errors).toEqual([]);
});

test('experience guides carry into invitations with inline maps and quick exact timing', async ({
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
  await page.locator('#dialog .embedded-map').scrollIntoViewIfNeeded();
  await expect(page.locator('#dialog iframe')).toHaveAttribute(
    'src',
    /maps.google.com\/maps\?q=Metropolitan/,
  );
  await expect.poll(() => queries.length).toBe(1);
  expect(queries[0]).toContain('720 Kamikanazaki');
  await expect(action(page, 'load-map')).toHaveCount(0);
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
  await page.getByText('About this outing & sources', { exact: true }).click();
  await expect(page.locator('.plan-view .experience-photo img')).toBeVisible();
  await expect(page.locator('.meeting-box')).toContainText('area only');
  await page.locator('.meeting-box iframe').scrollIntoViewIfNeeded();
  await expect.poll(() => queries.length).toBeGreaterThanOrEqual(2);
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
