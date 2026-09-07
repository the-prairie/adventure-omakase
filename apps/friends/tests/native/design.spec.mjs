import { test, expect, TEST_KEY } from './runtime.mjs';
import { writeFile } from 'node:fs/promises';

test.use({ companionFixture: true });

test('traveler surfaces retain readable controls across desktop and mobile', async ({
  page,
  browser,
  runtime,
}, info) => {
  test.setTimeout(240000);
  const manifest = [],
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const action = (name) =>
    page.locator(`[data-action="${name}"]:visible`).first();
  const close = async () => {
    if (await page.locator('#dialog').evaluate((dialog) => dialog.open))
      await action('close').click();
  };
  const nav = async (name) => {
    await close();
    await page.locator(`[data-nav="${name}"]:visible`).first().click();
  };
  async function capture(name, bottom = false) {
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);
    for (const width of [1344, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page.evaluate((bottom) => {
        const dialog = document.querySelector('#dialog');
        if (dialog.open) dialog.scrollTop = bottom ? dialog.scrollHeight : 0;
        else window.scrollTo(0, 0);
      }, bottom);
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          { message: `${name} fits ${width}px` },
        )
        .toBe(true);
      const path = info.outputPath(`${name}-${width}.png`);
      await page.screenshot({
        path,
        animations: 'disabled',
        style: 'input[readonly] { color: transparent !important; }',
      });
      manifest.push({
        name,
        width,
        path,
        data: 'Synthetic local workerd; provider fixtures, not live AI',
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await capture('01-owner-entry');
  await page.locator('#f-name').fill('Alex · synthetic');
  await page.locator('#auth-form [type=submit]').click();
  await capture('02-home-empty');
  await action('invite').click();
  await expect(page.locator('#invite-url')).toBeVisible();
  const invite = await page.locator('#invite-url').inputValue();
  await capture('03-invite');
  await close();
  const friend = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await friend.goto(invite);
  await friend.locator('#f-name').fill('Jamie · synthetic');
  await friend.locator('#auth-form [type=submit]').click();
  await expect(friend.locator('.header')).toBeVisible();
  await friend.close();

  await action('profile').click();
  await action('add-window').click();
  await page.locator('[data-w=region]').selectOption('osaka');
  await page.locator('[data-w=area]').fill('Nakanoshima · synthetic');
  await page.locator('[data-w=from]').fill('2026-09-26');
  await page.locator('[data-w=to]').fill('2026-10-03');
  await capture('04-profile');
  await capture('05-profile-bottom', true);
  await page.locator('#profile-form [type=submit]').click();
  await expect(page.locator('#dialog')).not.toBeVisible();

  await action('plan-new').click();
  await page.locator('#f-title').fill('A river walk, then lunch');
  await page.locator('#f-area').fill('Nakanoshima · synthetic');
  await page.locator('#f-date').fill('2026-09-29');
  await page.locator('#f-start').fill('10:00');
  await page.locator('#f-end').fill('13:00');
  await page.locator('#f-meeting').fill('Synthetic bridge meeting point');
  await page.locator('.plan-extra > summary').click();
  await page
    .locator('#f-description')
    .fill(
      'Synthetic walkthrough invitation. A slow walk by the river, then lunch. Join whichever part fits your day.',
    );
  await action('add-segment').click();
  await page.locator('[data-seg=label]').fill('Just lunch');
  await page.locator('[data-seg=start]').fill('12:00');
  await page.locator('[data-seg=end]').fill('13:00');
  await page.locator('[data-seg=meeting]').fill('Synthetic lunch entrance');
  await capture('06-plan-form');
  await capture('07-plan-form-bottom', true);
  await page.locator('#plan-form [type=submit]').click();
  await expect(page.locator('#dialog')).toContainText(
    'A river walk, then lunch',
  );
  await capture('08-plan-detail');
  await capture('09-plan-detail-bottom', true);
  await nav('plans');
  await capture('10-home-populated');
  await nav('day');
  await page.locator('[data-action=day][data-id="2026-09-29"]').click();
  await capture('11-my-day');
  await nav('people');
  await capture('12-people');
  await nav('story');
  await capture('13-story-empty');
  await action('moment-new').click();
  await page.locator('#f-title').fill('A small thing worth keeping');
  await page
    .locator('#memory-text')
    .fill(
      'Synthetic walkthrough memory. We took the long way along the river and stopped to compare our very different mornings.',
    );
  await capture('14-memory-form');
  await page.locator('#moment-form [type=submit]').click();
  await expect(page.locator('#dialog')).not.toBeVisible();
  await capture('15-story-populated');
  await action('print-story').click();
  await capture('16-print-options');
  await nav('discover');
  await capture('17-discover');
  await page.locator('#search').fill('nothing-matches-this-synthetic-string');
  await expect(page.locator('#main')).toContainText(
    'That is quite a specific adventure.',
  );
  await capture('18-discover-empty');
  await action('clear-filters').click();
  await page.locator('[data-action=discovery]').first().click();
  await capture('19-discovery-detail');
  await capture('20-discovery-source', true);
  await close();
  await action('dice').click();
  await capture('21-draw');
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-result')).not.toBeEmpty();
  await capture('22-draw-result', true);
  await close();
  await action('find-new').click();
  await capture('23-friend-find');
  await close();
  await action('ask-find').click();
  await capture('24-research-request');
  await page.locator('.ask-timing summary').click();
  await capture('25-research-context');
  await close();
  await action('companion').click();
  await capture('26-companion');
  for (const kind of ['places', 'route', 'translate', 'memory', 'search']) {
    await close();
    await action('companion').click();
    await page.locator(`[data-travel=open][data-value=${kind}]`).click();
    await capture(`27-helper-${kind}`);
    if (['translate', 'memory'].includes(kind))
      await page.locator('#travel-text').fill('Synthetic review note.');
    if (kind === 'route')
      await page.locator('#travel-destination').fill('Synthetic station');
    if (kind === 'search')
      await page.locator('#travel-query').fill('Synthetic venue near Osaka');
    await page.locator('#travel-form [type=submit]').click();
    await expect(page.locator('#travel-form')).not.toBeVisible();
    await expect(page.locator('[data-travel=cancel]')).not.toBeVisible();
    await expect(page.locator('.travel-tool')).not.toContainText('A pause');
    await capture(`27-result-${kind}`);
    await capture(`27-result-${kind}-bottom`, true);
  }
  await close();
  await action('companion').click();
  await page.locator('[data-travel=open][data-value=translate]').click();
  await page.locator('[data-travel=history]').click();
  await capture('28-helper-history');
  await close();
  await action('companion').click();
  await page.locator('[data-travel=watches]').click();
  await capture('29-watches');
  await page.locator('[data-travel=open][data-value=watch]').click();
  await capture('30-watch-form');
  await close();
  await action('updates').click();
  await capture('31-updates');
  await close();
  await action('settings').click();
  await capture('32-settings');
  await capture('33-settings-bottom', true);
  await action('trip-window').click();
  await capture('34-trip-window');
  await close();
  expect(errors).toEqual([]);
  await writeFile(
    info.outputPath('surface-manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
});
