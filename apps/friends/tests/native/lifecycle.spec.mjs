import { test, expect, TEST_KEY } from './runtime.mjs';

test('real fetch polling with controlled clock and visibility signals', async ({
  page,
  runtime,
}) => {
  // Headless Chromium/WebKit report every tab visible. Control only the visibility
  // signal and clock here; navigation, cookies, fetch, storage and workerd are real.
  await page.clock.install();
  let polls = 0;
  page.on('request', (r) => {
    if (r.url().includes('/api/sync')) polls++;
  });
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Lifecycle test');
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('[data-nav=day]:visible').first()).toBeVisible();
  await page.clock.fastForward(22000);
  await expect.poll(() => polls).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(180000);
  expect(polls).toBe(1);
  const foreground = page.waitForResponse((r) => r.url().includes('/api/sync'));
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await foreground;
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(polls).toBe(2);
  await page.context().setOffline(true);
  await page.clock.fastForward(22000);
  await expect.poll(() => polls).toBe(3);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterFailure = polls;
  await page.clock.fastForward(25000);
  expect(polls).toBe(afterFailure);
  await page.clock.fastForward(8000);
  await expect.poll(() => polls).toBe(4);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await page.clock.fastForward(35000);
  expect(polls).toBe(4);
  await page.context().setOffline(false);
  const refreshed = page.waitForResponse((r) => r.url().includes('/api/state'));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await refreshed;
  await expect(page.locator('.offline')).toHaveCount(0);
});

test('service-worker upgrade clears legacy shell and stale release mutations fail', async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url);
  await page.evaluate(async () => {
    const cache = await caches.open('omakase-friends-v3.0.0');
    await cache.put('/old-shell.js', new Response('legacy shell fixture'));
  });
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Upgrade test');
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('[data-nav=day]:visible').first()).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual([]);
  const status = await page.evaluate(async () => {
    const r = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Omakase': '1',
        'X-Omakase-Release': 'previous-release',
      },
      body: JSON.stringify({ name: 'Must not save' }),
    });
    return r.status;
  });
  expect(status).toBe(409);
  const me = await page.evaluate(() =>
    fetch('/api/state').then((r) => r.json()),
  );
  expect(me.me.name).toBe('Upgrade test');
  await page.reload();
  await expect(page.locator('[data-nav=day]:visible').first()).toBeVisible();
  const manifest = await page.evaluate(() =>
    fetch('/manifest.webmanifest').then((r) => r.json()),
  );
  expect(manifest.start_url).toBe('/');
});
