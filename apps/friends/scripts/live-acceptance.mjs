/** Opt-in isolated-preview acceptance. Uses real HTTPS, model, D1 and R2.
 * Never run in routine CI. Credentials and browser state stay in ignored .deploy.
 */
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, loadJSON, admin } from './operator-lib.mjs';

const ordinary = process.argv.includes('--ordinary');
const op = await loadJSON('.deploy/preview/operator.json');
if (!op.name.endsWith('-preview'))
  throw Error('Only the isolated preview is permitted.');
const health = await fetch(op.url + '/api/health').then((r) => r.json());
if (
  process.env.OMAKASE_EXPECTED_SHA &&
  health.release !== process.env.OMAKASE_EXPECTED_SHA
)
  throw Error('The deployed release differs from the expected commit.');
const dir = resolve(ROOT, '.deploy/preview/live-acceptance');
const evidence = resolve(ROOT, 'evidence/live');
await mkdir(dir, { recursive: true, mode: 0o700 });
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [];
const report = {
  kind: ordinary
    ? 'ordinary live HTTPS acceptance; no AI evidence'
    : 'real-provider live HTTPS acceptance',
  release: health.release,
  workerVersion: health.workerVersion,
  started: new Date().toISOString(),
  date: '2026-09-28',
  timezone: 'Asia/Tokyo',
  checks: [],
};
const action = (p, a) => p.locator(`[data-action="${a}"]:visible`).first();
const state = (p) =>
  p.evaluate(() => fetch('/api/state').then((r) => r.json()));
async function page(who, width) {
  const path = resolve(dir, who + '.json');
  let storageState;
  try {
    storageState = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    /* First run. */
  }
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    timezoneId: 'Asia/Tokyo',
    storageState,
  });
  contexts.push({ context, path });
  const p = await context.newPage();
  await p.clock.setFixedTime(new Date('2026-09-27T09:00:00+09:00'));
  await p.goto(op.url);
  return p;
}
async function persist() {
  for (const { context, path } of contexts)
    await writeFile(path, JSON.stringify(await context.storageState()), {
      mode: 0o600,
    });
}
async function profile(p, region, area) {
  await action(p, 'profile').click();
  await p
    .locator('#f-interests')
    .fill(
      region === 'osaka'
        ? 'Unusual architecture, small museums, good lunch; moderate walking'
        : 'Tokyo galleries and quiet mornings',
    );
  if (!(await p.locator('[data-w=region]').count()))
    await action(p, 'add-window').click();
  await p.locator('[data-w=region]').first().selectOption(region);
  await p.locator('[data-w=area]').first().fill(area);
  await p.locator('[data-w=from]').first().fill('2026-09-26');
  await p.locator('[data-w=to]').first().fill('2026-10-14');
  await p.locator('#profile-form [type=submit]').click();
  await expect(p.locator('#profile-form')).toHaveCount(0);
}
try {
  const a = await page('a', 1440),
    b = await page('b', 390),
    c = await page('c', 390);
  if (!(await state(a)).me) {
    if (health.setupRequired) {
      await a.goto(op.url + '/#setup=' + op.setupKey);
      await a.locator('#f-name').fill('Synthetic A');
      await a.locator('#f-title').fill('Isolated live acceptance');
      await a.locator('#auth-form [type=submit]').click();
    } else {
      const recovery = await (
        await admin({ ...op, key: op.setupKey }, '/owner-device', 'POST', {})
      ).json();
      await a.goto(op.url + '/#device=' + recovery.key);
    }
    await expect(a.locator('[data-nav=people]:visible').first()).toBeVisible();
  }
  const initial = await state(a);
  if (initial.trip.name !== 'Isolated live acceptance')
    throw Error(
      'This is not the synthetic acceptance trip. Refusing to edit it.',
    );
  await action(a, 'invite').click();
  const invite = await a.locator('#invite-url').inputValue();
  await a.keyboard.press('Escape');
  for (const [p, name] of [
    [b, 'Synthetic B'],
    [c, 'Synthetic C'],
  ]) {
    if (!(await state(p)).me) {
      await p.goto(invite);
      await p.locator('#f-name').fill(name);
      await p.locator('#auth-form [type=submit]').click();
      await expect(
        p.locator('[data-nav=people]:visible').first(),
      ).toBeVisible();
    }
  }
  await persist();
  await profile(a, 'osaka', 'Namba');
  await profile(b, 'osaka', 'Namba');
  await profile(c, 'tokyo', 'Ueno');
  report.checks.push('Three independent sessions; C shares Tokyo dates');
  await a.reload();
  if (!ordinary) {
    await action(a, 'ask-find').click();
    await a
      .locator('#ask-prompt')
      .fill(
        'I’m in Osaka tomorrow. I want something unusual for a couple of hours, then a good lunch. I’m going either way; friends can join whichever part they like.',
      );
    await expect(a.locator('#ask-date')).toHaveValue('2026-09-28');
    await a.locator('#ask-area').fill('Namba');
    const response = a.waitForResponse(
      (r) =>
        r.url().endsWith('/api/ask/tasks') && r.request().method() === 'POST',
      { timeout: 95000 },
    );
    await a.locator('#ask-form [type=submit]').click();
    const result = await (await response).json();
    if (result.status !== 'complete' || !result.result?.options?.length) {
      report.provider = {
        status: result.status,
        stage: result.stage,
        usage: result.usage,
      };
      throw Error(
        'Live provider did not return usable options: ' + result.stage,
      );
    }
    report.provider = {
      usage: result.result.usage,
      sources: result.result.sources.map((s) => ({
        title: s.title,
        url: s.url,
        status: s.status,
        checkedAt: s.checkedAt,
      })),
      options: result.result.options,
    };
    expect(result.result.options.length).toBeGreaterThanOrEqual(2);
    await expect(a.locator('.ask-option')).toHaveCount(
      result.result.options.length,
    );
    await a.screenshot({ path: resolve(evidence, 'ask-options-desktop.png') });
    await a.setViewportSize({ width: 390, height: 900 });
    await a.screenshot({ path: resolve(evidence, 'ask-options-mobile.png') });
    await a.setViewportSize({ width: 1440, height: 900 });
    await a.locator('[data-ask=draft]').first().click();
    await expect(a.locator('[data-ask-part]')).toHaveCount(2);
    await a.screenshot({ path: resolve(evidence, 'ask-confirm-desktop.png') });
    await a.locator('#ask-confirm-form [type=submit]').click();
    await expect(a.locator('#ask-confirm-form')).toHaveCount(0);
    const current = await state(a);
    const plan =
      current.plans.find((p) => p.requestId === 'ask-' + result.id) ||
      current.plans.find(
        (p) => p.title === result.result.options[0].draft.title,
      );
    if (!plan) throw Error('No canonical published plan was found.');
    report.planId = plan.id;
    report.checks.push(
      'Real model sourced options; explicit UI confirmation published canonical invitation',
    );
    const lunch = plan.segments[1];
    await b.goto(op.url + '/#plan=' + plan.id);
    await b.locator(`[name=choice][value="${lunch.id}"]`).check();
    await b.locator('#rsvp-form [value=joined]').click();
    await expect(b.locator('#dialog')).toContainText('Update my part');
    await b.keyboard.press('Escape');
    await b.locator('[data-nav=day]:visible').first().click();
    await b.locator('[data-action=day][data-id="2026-09-28"]').click();
    await expect(b.locator('#main')).toContainText(
      lunch.start + '–' + lunch.end,
    );
    await expect(b.locator('#main')).toContainText(lunch.meeting);
    await b.screenshot({
      path: resolve(evidence, 'lunch-only-mobile.png'),
      fullPage: true,
    });
    const cs = await state(c);
    expect(
      cs.plans
        .find((p) => p.id === plan.id)
        .rsvps.some((r) => r.memberId === cs.me.id),
    ).toBe(false);
    report.checks.push(
      'B joins lunch only; My day has lunch time/meeting; Tokyo C has no participation',
    );
    await action(a, 'plan-edit').click();
    await a
      .locator(`[data-segment="${lunch.id}"] [data-seg=meeting]`)
      .fill('Main entrance — host will hold a green fieldbook');
    await a.locator('#plan-form [type=submit]').click();
    await expect(a.locator('#plan-form')).toHaveCount(0);
    await b.reload();
    await b.goto(op.url + '/#plan=' + plan.id);
    await expect(b.locator('#dialog')).toContainText('Reconfirm my part');
    await b.screenshot({ path: resolve(evidence, 'reconfirm-mobile.png') });
    report.checks.push('Host meeting edit requires B to reconfirm');
  }
  await b.keyboard.press('Escape');
  await b.locator('[data-nav=story]:visible').first().click();
  if (
    !(await state(b)).moments.some((m) => m.title === 'Synthetic cloud photo')
  ) {
    await action(b, 'moment-new').click();
    await b.locator('#f-title').fill('Synthetic cloud photo');
    await b
      .locator('[name=text]')
      .fill(
        'Synthetic acceptance image, shared by default. No personal photograph.',
      );
    expect(await b.locator('[name=visibility]').inputValue()).toBe('group');
    const photo = await b.evaluate(() => {
      // This function executes in the browser.
      // eslint-disable-next-line no-undef
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 400;
      const x = c.getContext('2d');
      x.fillStyle = '#244d3c';
      x.fillRect(0, 0, 600, 400);
      x.fillStyle = '#faf6ed';
      x.font = '30px serif';
      x.fillText('Synthetic acceptance image', 70, 210);
      return c.toDataURL('image/jpeg').split(',')[1];
    });
    await b.locator('#memory-photo').setInputFiles({
      name: 'synthetic.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(photo, 'base64'),
    });
    await expect(b.locator('#photo-preview figure')).toHaveCount(1);
    await b.locator('#moment-form [type=submit]').click();
    await expect(b.locator('#moment-form')).toHaveCount(0);
  }
  await a.keyboard.press('Escape');
  await a.reload();
  await a.locator('[data-nav=story]:visible').first().click();
  const img = a.locator('#main img[src^="/api/photos/"]').first();
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  await a.screenshot({
    path: resolve(evidence, 'shared-photo-desktop.png'),
    fullPage: true,
  });
  report.checks.push(
    'B uploads real R2 photo; shared-by-default memory and A decodes authenticated photo',
  );
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.error = e.message.replace(
    /#(?:setup|join|device)=[^\s"']+/g,
    '#[redacted]',
  );
  process.exitCode = 1;
} finally {
  await persist();
  await browser.close();
  report.finished = new Date().toISOString();
  await writeFile(
    resolve(evidence, ordinary ? 'ordinary-live.json' : 'provider-live.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      kind: report.kind,
      passed: report.passed,
      checks: report.checks,
      error: report.error,
    }),
  );
}
