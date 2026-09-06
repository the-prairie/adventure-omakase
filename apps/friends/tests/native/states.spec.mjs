import { test, expect, TEST_KEY } from './runtime.mjs';
import { writeFile } from 'node:fs/promises';

const action = (page, name) =>
  page.locator(`[data-action="${name}"]:visible`).first();
const close = async (page) => {
  if (await page.locator('#dialog').evaluate((dialog) => dialog.open))
    await action(page, 'close').click();
};
async function login(page, url, name) {
  await page.goto(url);
  await page.locator('#f-name').fill(name);
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('[data-nav=people]:visible').first()).toBeVisible();
}
function captures(info) {
  const manifest = [];
  return {
    async capture(page, name, bottom = false) {
      await expect(page.locator('#toast')).not.toHaveClass(/visible/);
      for (const width of [390, 1344]) {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 960,
        });
        await page.evaluate((bottom) => {
          const dialog = document.querySelector('#dialog');
          if (dialog?.open) {
            dialog.scrollTop = bottom ? dialog.scrollHeight : 0;
            if (typeof bottom === 'string') {
              document.querySelector(bottom)?.scrollIntoView();
              dialog.scrollTop -= 80;
            }
          } else window.scrollTo(0, 0);
        }, bottom);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
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
          data: 'Synthetic local workerd; no live provider acceptance',
        });
      }
    },
    async save() {
      await writeFile(
        info.outputPath('states-manifest.json'),
        JSON.stringify(manifest, null, 2),
      );
    },
  };
}

test('invitation boundaries and recovery have inspected screenshot states', async ({
  browser,
  runtime,
}, info) => {
  test.setTimeout(240000);
  const contexts = [];
  async function member() {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    contexts.push(context);
    return context.newPage();
  }
  const owner = await member(),
    friend = await member(),
    waiting = await member(),
    visitor = await member();
  const { capture, save } = captures(info);
  try {
    await login(owner, runtime.url + '/#setup=' + TEST_KEY, 'Alex synthetic');
    await visitor.goto(runtime.url);
    await expect(visitor.getByText('Got the group link?')).toBeVisible();
    await capture(visitor, 'recovery-entry');
    await visitor.goto(runtime.url + '/#join=invalid');
    await visitor.locator('#f-name').fill('Invalid synthetic');
    await visitor.locator('#auth-form [type=submit]').click();
    await expect(visitor.locator('.form-error')).toContainText('replaced');
    await capture(visitor, 'invalid-invitation');
    await action(owner, 'invite').click();
    const invitation = await owner.locator('#invite-url').inputValue();
    await login(friend, invitation, 'Jamie synthetic');
    await login(waiting, invitation, 'Robin synthetic');
    await close(owner);
    await action(owner, 'settings').click();
    await action(owner, 'device-link').click();
    await capture(owner, 'personal-device-recovery');
    const device = await owner.locator('#invite-url').inputValue();
    await visitor.goto(device);
    await expect(
      visitor.locator('[data-nav=people]:visible').first(),
    ).toBeVisible();
    await capture(visitor, 'recovered-session');
    await close(owner);
    await action(owner, 'plan-new').click();
    await owner.locator('#f-title').fill('Synthetic lunch with two places');
    await owner.locator('#f-area').fill('Namba');
    await owner.locator('#f-date').fill('2026-10-04');
    await owner.locator('#f-start').fill('12:00');
    await owner.locator('#f-end').fill('13:00');
    await owner.locator('#f-meeting').fill('Synthetic north entrance');
    await owner.locator('.form-detail summary').click();
    await owner.locator('#f-capacity').fill('2');
    await owner.locator('#plan-form [type=submit]').click();
    await expect(owner.locator('[data-action=plan-edit]')).toBeVisible();
    const state = await owner.evaluate(() =>
      fetch('/api/state').then((r) => r.json()),
    );
    const planURL = runtime.url + '/#plan=' + state.plans[0].id;
    await friend.goto(planURL);
    await friend.locator('#rsvp-form [value=joined]').click();
    await expect(friend.locator('#dialog')).toContainText('Update my part');
    await waiting.goto(planURL);
    await expect(waiting.locator('#dialog')).toContainText('Join the waitlist');
    await capture(waiting, 'full-invitation');
    await capture(waiting, 'full-invitation-response', '#rsvp-form');
    await waiting.locator('#rsvp-form [value=waitlist]').click();
    await expect(waiting.locator('#dialog')).toContainText('Waitlist');
    await capture(waiting, 'waitlisted-response', true);
    await action(owner, 'plan-edit').click();
    await owner.locator('#f-meeting').fill('Changed synthetic south entrance');
    await owner.locator('#plan-form [type=submit]').click();
    await expect(owner.locator('[data-action=plan-edit]')).toBeVisible();
    await friend.reload();
    await expect(friend.locator('#dialog')).toContainText('Reconfirm my part');
    await capture(friend, 'changed-invitation');
    await capture(friend, 'reconfirm-response', '#rsvp-form');
    await friend.locator('#rsvp-form [value=joined]').click();
    await expect(friend.locator('#dialog')).toContainText('Update my part');
    await action(owner, 'plan-cancel').click();
    await capture(owner, 'cancel-confirmation');
    await action(owner, 'confirm').click();
    await expect(owner.locator('#dialog')).not.toBeVisible();
    await friend.reload();
    await expect(friend.locator('#dialog')).toContainText('cancelled');
    await capture(friend, 'cancelled-invitation');
    await save();
  } finally {
    for (const context of contexts) await context.close();
  }
});

test('unavailable research, cancellation, offline and stale edits remain explicit', async ({
  browser,
  runtime,
}, info) => {
  test.setTimeout(180000);
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const { capture, save } = captures(info);
  try {
    await login(
      page,
      runtime.url + '/#setup=' + TEST_KEY,
      'Synthetic error traveler',
    );
    await action(page, 'discover-nav').click();
    await action(page, 'ask-find').click();
    await page.locator('#ask-area').fill('Namba');
    // Hold transport before workerd receives the task. The real cancellation
    // endpoint records cancellation before the delayed request can start.
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/api/ask/tasks', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await held;
      await route.abort().catch(() => {
        /* Cancellation may already have closed the held request. */
      });
    });
    await page.locator('#ask-form [type=submit]').click();
    await expect(page.locator('#ask-stage')).toBeVisible();
    await capture(page, 'research-loading');
    await page.locator('[data-ask=cancel]').click();
    await expect(page.locator('#dialog')).toContainText(
      'Cancelled before starting',
    );
    release();
    await page.unroute('**/api/ask/tasks');
    await capture(page, 'research-cancelled');
    await page.locator('[data-ask=retry]').click();
    await page.locator('#ask-form [type=submit]').click();
    await expect(page.locator('#dialog')).toContainText(
      'A pause in the research.',
    );
    await capture(page, 'research-unavailable');
    await page.locator('[data-ask=retry]').click();
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.locator('#ask-form [type=submit]').click();
    await expect(page.locator('.form-error')).toContainText('offline');
    await capture(page, 'offline-unsent-research');
    await context.setOffline(false);
    await page.reload();
    await action(page, 'profile').click();
    // Send the real edit to workerd with an obsolete client header; the server
    // provides the actual release-conflict response, not a fabricated error.
    await page.route('**/api/profile', (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          'x-omakase-release': 'previous-release',
        },
      }),
    );
    await page.locator('#profile-form [type=submit]').click();
    await expect(page.locator('.form-error')).toContainText(
      /refresh|reload|version/i,
    );
    await capture(page, 'stale-release-edit', true);
    await save();
  } finally {
    await context.close();
  }
});
