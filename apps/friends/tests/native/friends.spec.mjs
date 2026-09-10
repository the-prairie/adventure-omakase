import { test, expect, TEST_KEY } from './runtime.mjs';
import { resolve } from 'node:path';
import { ROOT } from '../../scripts/operator-lib.mjs';
import { isLocalRuntimeDisconnect } from './reload-transport.mjs';

const action = (page, name) =>
  page.locator(`[data-action="${name}"]:visible`).first();
async function close(page) {
  if (await page.locator('#dialog').evaluate((d) => d.open))
    await page.keyboard.press('Escape');
}
async function nav(page, view) {
  await close(page);
  await page.locator(`[data-nav="${view}"]:visible`).first().click();
}
async function state(page) {
  return page.evaluate(() => fetch('/api/state').then((r) => r.json()));
}
async function call(page, path, method = 'GET', data) {
  return page.evaluate(
    async ({ path, method, data }) => {
      const r = await fetch('/api' + path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Omakase': '1' },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return {
        status: r.status,
        data: r.status === 204 ? null : await r.json(),
      };
    },
    { path, method, data },
  );
}
const diagnostics = new WeakMap();
async function fresh(page) {
  const response = await page.reload();
  const info = test.info();
  if (
    response?.status() === 500 &&
    !info.annotations.some((a) => a.type === 'local-runtime-recovery')
  ) {
    const evidence = {
      method: response.request().method(),
      url: response.url(),
      expectedOrigin: diagnostics.get(page)?.origin,
      status: response.status(),
      body: await response.text(),
    };
    if (isLocalRuntimeDisconnect(evidence)) {
      evidence.body = evidence.body.replace(
        /file:\/\/\/.*\/miniflare\/dist/,
        'file:///<miniflare>/dist',
      );
      info.annotations.push({
        type: 'local-runtime-recovery',
        description:
          'One Miniflare GET disconnect; fresh read repeated once. Not a clean first-attempt runtime pass.',
      });
      await info.attach('local-runtime-recovery', {
        body: JSON.stringify(evidence),
        contentType: 'application/json',
      });
      console.warn(
        'Recovered one identified local Miniflare GET disconnect; evidence retained.',
      );
      // The upstream local proxy can remain disconnected briefly after the fault.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await page.reload();
    }
  }
  try {
    await expect(page.locator('.header')).toBeVisible();
  } catch (cause) {
    const body = await page
      .locator('body')
      .innerText({ timeout: 2000 })
      .catch(() => 'Body unavailable');
    throw new Error(
      'Reload failed to render: ' +
        JSON.stringify({
          body: body.slice(0, 1200),
          ...diagnostics.get(page),
        }),
      { cause },
    );
  }
}
async function join(page, url, name) {
  await page.goto(url);
  await page.locator('#f-name').fill(name);
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('[data-nav=people]:visible').first()).toBeVisible();
}

test('friends use real navigation, cookies, D1 and R2 independently', async ({
  browser,
  runtime,
}, testInfo) => {
  const contexts = [];
  const errors = [];
  async function friendPage(width = 1280, serviceWorkers = 'allow') {
    const c = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId: 'America/Edmonton',
      reducedMotion: 'reduce',
      serviceWorkers,
    });
    contexts.push(c);
    c.setDefaultTimeout(15000);
    const p = await c.newPage();
    await p.clock.setFixedTime(new Date('2026-09-06T12:00:00Z'));
    const observed = { origin: runtime.url, errors: [], failedRequests: [] };
    diagnostics.set(p, observed);
    p.on('pageerror', (e) => {
      errors.push(e.message);
      observed.errors.push(e.message);
    });
    p.on('requestfailed', (r) =>
      observed.failedRequests.push({
        path: new URL(r.url()).pathname,
        error: r.failure()?.errorText,
      }),
    );
    return p;
  }
  const a = await friendPage(),
    // Request interception must bypass service workers in this one session.
    b = await friendPage(390, 'block'),
    c = await friendPage(),
    invalid = await friendPage();
  try {
    await test.step('empty owner setup and casual remembered joining', async () => {
      await a.goto(runtime.url + '/#setup=' + TEST_KEY);
      await a.locator('#f-name').fill('Test A');
      await a.locator('#f-title').fill('Synthetic friends acceptance');
      await a.locator('#auth-form [type=submit]').click();
      await expect(
        a.locator('[data-nav=people]:visible').first(),
      ).toBeVisible();
      const first = await state(a);
      expect(first.members).toHaveLength(1);
      expect(first.plans).toEqual([]);
      expect(first.moments).toEqual([]);
      await action(a, 'invite').click();
      const link = await a.locator('#invite-url').inputValue();
      expect(link).toContain('#join=');
      await close(a);
      await b.setViewportSize({ width: 390, height: 844 });
      await b.goto(link);
      await expect(
        b.locator('#auth-form input:not([type=hidden]):not([type=file])'),
      ).toHaveCount(1);
      await expect(b.locator('#join-booking-files')).toHaveCount(1);
      await expect(b.locator('#join-booking-files')).not.toHaveAttribute(
        'required',
      );
      await expect(b.locator('.server-note')).toContainText(
        'Names are not verified',
      );
      await b.screenshot({
        path: testInfo.outputPath('join-mobile.png'),
        fullPage: true,
      });
      await expect(b.locator('#auth-form [type=submit]')).toBeInViewport();
      await b.locator('#f-name').fill('Test B');
      await b.locator('#auth-form [type=submit]').click();
      await expect(
        b.locator('[data-nav=people]:visible').first(),
      ).toBeVisible();
      const id = (await state(b)).me.id;
      await fresh(b);
      expect((await state(b)).me.id).toBe(id);
      await join(c, link, 'Test C');
      await invalid.goto(runtime.url);
      await expect(invalid.getByText('Got the group link?')).toBeVisible();
      await invalid.goto(runtime.url + '/#join=invalid');
      await invalid.locator('#f-name').fill('Test Invalid');
      await invalid.locator('#auth-form [type=submit]').click();
      await expect(invalid.locator('.form-error')).toContainText('replaced');
      await invalid.goto(link);
      await invalid.locator('#f-name').fill('Test B');
      await invalid.locator('#auth-form [type=submit]').click();
      await expect(invalid.locator('.form-error')).toContainText(
        /name|already/i,
      );
      expect((await call(invalid, '/state')).status).toBe(401);
      await nav(c, 'people');
      await action(c, 'profile').click();
      await action(c, 'add-window').click();
      await c.locator('[data-w=region]').selectOption('okinawa');
      await c.locator('[data-w=from]').fill('2026-10-10');
      await c.locator('[data-w=to]').fill('2026-10-14');
      await c.locator('#profile-form [type=submit]').click();
      await expect(c.locator('#dialog')).not.toBeVisible();
      await nav(c, 'day');
      await expect(c.locator('#main')).toContainText(
        'No plans on your calendar.',
      );
      expect((await state(c)).me.profile.windows[0].from).toBe('2026-10-10');
    });
    let pid;
    await test.step('create solo run and join coffee, using its actual Japan time and place', async () => {
      await action(a, 'plan-new').click();
      await a.locator('#f-title').fill('Dawn run. Coffee together.');
      await a.locator('#f-area').fill('Synthetic Osaka area');
      await a.locator('.trip-day-picker > summary').click();
      await a.locator('#f-date').fill('2026-10-04');
      await a.locator('.trip-day-picker > summary').click();
      await a.locator('#f-start').fill('07:30');
      await a.locator('#f-end').fill('10:00');
      await a.locator('#f-meeting').fill('Synthetic running start');
      await a.locator('.plan-extra > summary').click();
      await a.locator('#f-joinStyle').selectOption('reunion');
      await action(a, 'add-segment').click();
      await a.locator('[data-seg=label]').fill('Just coffee');
      await a.locator('[data-seg=start]').fill('09:00');
      await a.locator('[data-seg=end]').fill('10:00');
      await a.locator('[data-seg=meeting]').fill('Synthetic coffee meeting');
      await a.locator('#plan-form [type=submit]').click();
      await expect(a.locator('#dialog')).toContainText(
        'Dawn run. Coffee together.',
      );
      pid = (await state(a)).plans[0].id;
      await fresh(b);
      await b.locator('.agenda-date-picker > summary').click();
      await b.locator('[data-action=day][data-id="2026-10-04"]').click();
      await b.locator('.agenda-scope [data-id=group]').click();
      await b
        .locator(`[data-action=plan-detail][data-id="${pid}"]`)
        .first()
        .click();
      expect(await b.locator('[name=choice][value=all]').count()).toBe(0);
      await b.locator('#rsvp-form [value=joined]').click();
      await expect(b.locator('#dialog')).toContainText('Update my part');
      await expect(b.locator('#toast')).not.toHaveClass(/visible/);
      // Hold the outgoing request while the friend navigates away, then send it
      // normally to the real backend without fabricating a response.
      let releaseReply,
        receivedReply = false;
      const held = new Promise((resolve) => {
        releaseReply = resolve;
      });
      await b.route('**/api/plans/*/rsvp', async (route) => {
        receivedReply = true;
        await held;
        await route.continue();
      });
      try {
        await b.locator('#rsvp-form [value=joined]').click();
        await expect
          .poll(() => receivedReply, {
            message: 'RSVP reached the controlled transport delay',
          })
          .toBe(true);
        await nav(b, 'day');
        releaseReply();
        await expect(b.locator('#toast')).toHaveClass(/visible/);
        await expect(b.locator('#toast')).toContainText(
          'Your chosen part is confirmed',
        );
        await expect(b.locator('#dialog')).not.toBeVisible();
        await expect(
          b.locator('[data-action=day][data-id="2026-10-04"]'),
        ).toHaveAttribute('aria-pressed', 'true');
      } finally {
        releaseReply();
        await b.unroute('**/api/plans/*/rsvp');
      }
      await nav(b, 'plans');
      await b.locator('.agenda-scope [data-id=mine]').click();
      await expect(b.locator('.agenda-entry')).toContainText(
        /09:00\s*–10:00 JST/,
      );
      await expect(b.locator('.agenda-entry')).toContainText('Just coffee');
      await expect(b.locator('.agenda-entry')).toContainText(
        'Synthetic coffee meeting',
      );
      await expect(b.locator('.agenda-entry')).not.toContainText(
        'Synthetic running start',
      );
      await b.screenshot({
        path: testInfo.outputPath('home-mobile.png'),
        fullPage: true,
      });
      await nav(b, 'day');
      await expect(
        b.locator('[data-action=day][data-id="2026-10-04"]'),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(b.locator('.commitment')).toContainText(
        /09:00\s*–10:00 JST/,
      );
      await expect(b.locator('.commitment')).toContainText(
        'Synthetic coffee meeting',
      );
      await expect(b.locator('.commitment')).not.toContainText(
        'Synthetic running start',
      );
      await b.screenshot({
        path: testInfo.outputPath('my-day-mobile.png'),
        fullPage: true,
      });
      await nav(b, 'discover');
      await b.goBack();
      await expect(b.locator('[data-nav=day]:visible').first()).toHaveAttribute(
        'aria-current',
        'page',
      );
      await b.goForward();
      await expect(
        b.locator('[data-nav=discover]:visible').first(),
      ).toHaveAttribute('aria-current', 'page');
    });
    await test.step('changed meeting point requires reconfirmation; stale and concurrent edits reject', async () => {
      await action(a, 'plan-edit').click();
      await a.locator('.plan-extra > summary').click();
      await a
        .locator('[data-seg=meeting]')
        .fill('Changed synthetic coffee meeting');
      await a.locator('#plan-form [type=submit]').click();
      await fresh(b);
      await nav(b, 'plans');
      await b.locator('.agenda-date-picker > summary').click();
      await b.locator('[data-action=day][data-id="2026-10-04"]').click();
      await b
        .locator(`[data-action=plan-detail][data-id="${pid}"]`)
        .first()
        .click();
      await expect(b.locator('#dialog')).toContainText('Reconfirm my part');
      await b.locator('#rsvp-form [value=joined]').click();
      await expect
        .poll(
          async () =>
            (await state(b)).plans.find((p) => p.id === pid).rsvps[0]
              .acceptedRevision,
        )
        .toBe(2);
      await close(b);
      const old = (await state(a)).plans.find((p) => p.id === pid);
      const results = await Promise.all([
        call(a, '/plans/' + pid, 'PUT', {
          ...old,
          meeting: 'Concurrent edit A',
        }),
        call(a, '/plans/' + pid, 'PUT', {
          ...old,
          meeting: 'Concurrent edit B',
        }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const p = (
        await call(a, '/plans', 'POST', {
          title: 'Last place test',
          area: 'Synthetic',
          region: 'osaka',
          date: '2026-10-05',
          start: '13:00',
          end: '14:00',
          meeting: 'Synthetic',
          capacity: 2,
          segments: [],
          requestId: 'capacity-test',
        })
      ).data;
      const joined = await Promise.all([
        call(b, `/plans/${p.id}/rsvp`, 'POST', {
          choice: 'all',
          status: 'joined',
          revision: 1,
        }),
        call(c, `/plans/${p.id}/rsvp`, 'POST', {
          choice: 'all',
          status: 'joined',
          revision: 1,
        }),
      ]);
      expect(joined.map((r) => r.status).sort()).toEqual([200, 409]);
      const winner = joined[0].status === 200 ? b : c,
        loser = winner === b ? c : b;
      expect(
        (
          await call(loser, `/plans/${p.id}/rsvp`, 'POST', {
            choice: 'all',
            status: 'waitlist',
            revision: 1,
          })
        ).status,
      ).toBe(200);
      await call(winner, `/plans/${p.id}/rsvp`, 'POST', { status: 'leave' });
      expect(
        (await state(loser)).plans.find((x) => x.id === p.id).rsvps[0].status,
      ).toBe('waitlist');
    });
    let mid;
    await test.step('friend adds a find and photo memory; another member reads real R2 photo', async () => {
      await nav(b, 'discover');
      await action(b, 'find-new').click();
      await b.locator('#f-title').fill('Test B pottery find');
      await b.locator('#f-area').fill('Synthetic neighborhood');
      await b
        .locator('[name=why]')
        .fill('A synthetic friend recommendation, not checked travel advice.');
      await b.locator('#find-form [type=submit]').click();
      await expect(b.locator('#dialog')).toContainText('Test B pottery find');
      expect((await state(a)).discoveries[0].memberId).toBe(
        (await state(b)).me.id,
      );
      await action(b, 'plan-from').click();
      await b.locator('#f-meeting').fill('Synthetic pottery meeting');
      await b.locator('#plan-form [type=submit]').click();
      await expect(b.locator('#dialog')).toContainText('Test B pottery find');
      expect(
        (await state(b)).plans.find((p) => p.title === 'Test B pottery find')
          .catalogueId,
      ).toBe((await state(b)).discoveries[0].id);
      await nav(b, 'story');
      await action(b, 'moment-new').click();
      await b.locator('#f-title').fill('The coffee was the plan');
      await b
        .locator('[name=text]')
        .fill('Synthetic browser acceptance memory.');
      expect(await b.locator('[name=visibility]').inputValue()).toBe('group');
      await b.locator('#memory-photo').setInputFiles({
        name: 'unsupported.heic',
        mimeType: 'image/heic',
        buffer: Buffer.from('not a decodable photo'),
      });
      await expect(b.locator('.form-error')).toContainText('Export it as JPEG');
      await b.locator('#memory-photo').setInputFiles({
        name: 'oversized.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(13 * 1024 * 1024),
      });
      await expect(b.locator('.form-error')).toContainText('under 12 MB');
      const source = await b.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 40, 40);
        ctx.fillStyle = 'blue';
        ctx.fillRect(40, 0, 40, 40);
        return {
          jpeg: canvas.toDataURL('image/jpeg').split(',')[1],
          png: canvas.toDataURL('image/png').split(',')[1],
        };
      });
      const jpg = Buffer.from(source.jpeg, 'base64');
      const exif = Buffer.concat([
        Buffer.from('Exif\0\0', 'binary'),
        Buffer.from([
          73, 73, 42, 0, 8, 0, 0, 0, 1, 0, 18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0,
          0, 0, 0, 0,
        ]),
      ]);
      const marker = Buffer.alloc(4);
      marker[0] = 255;
      marker[1] = 225;
      marker.writeUInt16BE(exif.length + 2, 2);
      const oriented = Buffer.concat([
        jpg.subarray(0, 2),
        marker,
        exif,
        jpg.subarray(2),
      ]);
      await b.locator('#memory-photo').setInputFiles({
        name: 'oriented.jpg',
        mimeType: 'image/jpeg',
        buffer: oriented,
      });
      await expect(b.locator('#photo-preview figure')).toHaveCount(1);
      await b.locator('#memory-photo').setInputFiles({
        name: 'supported.png',
        mimeType: 'image/png',
        buffer: Buffer.from(source.png, 'base64'),
      });
      await expect(b.locator('#photo-preview figure')).toHaveCount(2);
      await b
        .locator('#memory-photo')
        .setInputFiles(resolve(ROOT, 'public/assets/concrete.jpg'));
      await expect(b.locator('#photo-preview figure')).toHaveCount(3);
      await b
        .locator('#memory-photo')
        .setInputFiles(resolve(ROOT, 'public/assets/concrete.jpg'));
      await expect(b.locator('.form-error')).toContainText('at most three');
      await b.locator('#moment-form [type=submit]').click();
      await expect(b.locator('#dialog')).not.toBeVisible();
      mid = (await state(b)).moments[0].id;
      await close(a);
      await nav(a, 'story');
      await fresh(a);
      await expect(a.locator('#main')).toContainText('The coffee was the plan');
      const img = a.locator('#main img[src^="/api/photos/"]').first();
      await expect(img).toBeVisible();
      await expect
        .poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0))
        .toBe(true);
      expect(
        await img.evaluate((i) => [i.naturalWidth, i.naturalHeight]),
      ).toEqual([40, 80]);
      await b.locator(`[data-action=moment-edit][data-id="${mid}"]`).click();
      await b.locator('[name=text]').fill('Edited synthetic memory');
      await b.locator('#moment-form [type=submit]').click();
      await b.locator(`[data-action=moment-delete][data-id="${mid}"]`).click();
      await action(b, 'confirm').click();
      await expect.poll(async () => (await state(b)).moments.length).toBe(0);
      await action(b, 'settings').click();
      await action(b, 'moment-restore').click();
      await expect.poll(async () => (await state(b)).moments.length).toBe(1);
      await expect(b.locator('#toast')).toHaveText(
        'That memory is back in the book.',
      );
      await close(b);
      await nav(b, 'story');
      await action(b, 'print-story').click();
      await action(b, 'print-now').click();
      await expect(b.locator('#print-edition .print-memory')).toHaveCount(1);
      await b.emulateMedia({ media: 'print' });
      await b.screenshot({
        path: testInfo.outputPath('return-edition.png'),
        fullPage: true,
      });
      await b.emulateMedia({ media: 'screen' });
    });
    await test.step('offline edits remain unconfirmed and reconnect without duplicates', async () => {
      await close(a);
      await action(a, 'plan-new').click();
      await a.locator('#f-title').fill('Offline draft');
      await a.locator('#f-area').fill('Synthetic area');
      await a.locator('#f-meeting').fill('Synthetic point');
      const before = (await state(a)).plans.length;
      await a.context().setOffline(true);
      await a.locator('#plan-form [type=submit]').click();
      await expect(a.locator('.form-error')).toContainText(
        /offline|interrupted/i,
      );
      await a.context().setOffline(false);
      await expect.poll(async () => (await state(a)).plans.length).toBe(before);
      await a.locator('#plan-form [type=submit]').click();
      await expect
        .poll(async () => (await state(a)).plans.length)
        .toBe(before + 1);
      await close(a);
    });
    await test.step('late invitation save respects a closed form', async () => {
      await action(b, 'plan-new').click();
      await b.locator('#f-title').fill('Synthetic delayed invitation');
      await b.locator('#f-area').fill('Synthetic area');
      await b.locator('#f-meeting').fill('Synthetic meeting');
      let releaseSave,
        receivedSave = false;
      const held = new Promise((resolve) => {
        releaseSave = resolve;
      });
      await b.route('**/api/plans', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        receivedSave = true;
        await held;
        await route.continue();
      });
      try {
        await b.locator('#plan-form [type=submit]').click();
        await expect.poll(() => receivedSave).toBe(true);
        await nav(b, 'discover');
        releaseSave();
        await expect(b.locator('#toast')).toContainText(
          'Your invitation is open',
        );
        await expect(b.locator('#dialog')).not.toBeVisible();
        await b.screenshot({
          path: testInfo.outputPath('late-save-stays-on-discover.png'),
          fullPage: true,
        });
        expect(
          (await state(b)).plans.some(
            (p) => p.title === 'Synthetic delayed invitation',
          ),
        ).toBe(true);
      } finally {
        releaseSave();
        await b.unroute('**/api/plans');
      }
    });
    await test.step('responsive real UI, keyboard, source catalogue and scheduled handler', async () => {
      for (const width of [320, 390, 768, 1440]) {
        await a.setViewportSize({ width, height: 900 });
        await nav(a, 'plans');
        await a.screenshot({
          path: testInfo.outputPath(`layout-${width}.png`),
          fullPage: true,
        });
        const overflow = await a.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('body *')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .map((e) => ({
              tag: e.tagName,
              class: e.className,
              right: e.getBoundingClientRect().right,
            }))
            .slice(0, 15),
        }));
        expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
          width,
        );
        await a.screenshot({
          path: testInfo.outputPath(`plans-${width}.png`),
          fullPage: true,
        });
      }
      await nav(a, 'discover');
      expect(await a.evaluate(() => window.OMAKASE.catalogue.length)).toBe(300);
      await a.locator('#search').fill('Sayamaike');
      await expect(a.locator('.discovery-grid > article')).toHaveCount(1);
      await a
        .locator('.discovery-grid [data-action=discovery]')
        .first()
        .click();
      await a.keyboard.press('Escape');
      await expect(a.locator('#dialog')).not.toBeVisible();
      const scheduled = await fetch(
        runtime.url + '/__scheduled?cron=17+4+*+*+*',
      );
      expect(scheduled.ok).toBe(true);
      await invalid.goto(runtime.url + '/example.html');
      await expect(invalid.locator('.tagbar')).toContainText(
        'FICTIONAL PEOPLE',
      );
      expect((await state(a)).members).toHaveLength(3);
      expect(errors).toEqual([]);
    });
  } finally {
    // Preserve the failing action instead of masking it with teardown errors.
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});

test('unavailable research offers a working fieldbook fallback', async ({
  page,
  runtime,
}) => {
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Fallback tester');
  await page.locator('#auth-form [type=submit]').click();
  await nav(page, 'discover');
  await action(page, 'ask-find').click();
  await page.locator('#ask-area').fill('Namba');
  await page.locator('#ask-form [type=submit]').click();
  await expect(page.locator('#dialog')).toContainText(
    'A pause in the research',
  );
  await page.getByRole('button', { name: 'Browse ideas', exact: true }).click();
  await expect(page.locator('#dialog')).not.toBeVisible();
  await expect(page.locator('#search')).toBeVisible();
  expect((await state(page)).plans).toEqual([]);
});

test('opening a new dialog starts at its title after a long form', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Dialog tester');
  await page.locator('#auth-form [type=submit]').click();
  await action(page, 'plan-new').click();
  await page.locator('.plan-extra > summary').click();
  await page.locator('#dialog').evaluate((dialog) => {
    dialog.scrollTop = dialog.scrollHeight;
  });
  expect(
    await page.locator('#dialog').evaluate((d) => d.scrollTop),
  ).toBeGreaterThan(0);
  await close(page);
  await nav(page, 'discover');
  await page.locator('.discovery-grid [data-action=discovery]').first().click();
  await expect
    .poll(() => page.locator('#dialog').evaluate((d) => d.scrollTop))
    .toBe(0);
  await expect(page.locator('#dialog h2')).toBeInViewport();
});
