import { test, expect, TEST_KEY } from './runtime.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// These are fictional travelers. Every trip, profile, plan, RSVP and memory is
// created through the real browser UI against the isolated workerd fixture.
// RECORD_TRIP=1 adds watchable pacing, annotations and one video per chapter.
const recording = process.env.RECORD_TRIP === '1';
const output = process.env.TRIP_RECORDING_DIR;
// Operator-mediated scenarios need explicit decisions; ordinary suites must not wait for them.
test.skip(
  !output,
  'Set TRIP_RECORDING_DIR with actor decisions to run the pilot.',
);
const state = async (page) => (await page.request.get('/api/state')).json();
const actors = ['Ariel', 'Claire', 'Avery', 'Brooke'];
const bios = {
  Ariel:
    '35. Editor. Wants to find one ordinary Tuesday in Osaka. Spontaneity with a way home.',
  Claire:
    'Slow afternoon. Looking for a regular cafe and somewhere to sit without expectations.',
  Avery:
    'Records, secondhand clothes, and belonging without performing interestingness.',
  Brooke: 'Ceramics and everyday useful objects. A modest afternoon budget.',
};
const windows = [
  {
    region: 'osaka',
    area: 'Kitahama / Nakanoshima',
    from: '2026-10-03',
    to: '2026-10-03',
  },
];

test('four independent actors propose afternoons, decline in comments and choose an optional dinner', async ({
  browser,
  runtime,
}, info) => {
  test.setTimeout(3600000);
  if (recording && !output)
    throw Error('TRIP_RECORDING_DIR is required for a recording.');
  const dir = output ? resolve(output) : info.outputPath('simulation');
  await mkdir(join(dir, 'clips'), { recursive: true });
  await mkdir(join(dir, 'screenshots'), { recursive: true });
  const sessions = {},
    chapters = [];
  let invitation;
  const pause = async (page, ms = 650) => {
    if (recording) await page.waitForTimeout(ms);
  };
  async function click(page, selector) {
    const target =
      typeof selector === 'string' ? page.locator(selector).first() : selector;
    if (recording) {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: 12,
      });
      await pause(page, 220);
    }
    await target.click();
    await pause(page);
  }
  async function fill(page, selector, text) {
    await click(page, selector);
    await page.locator(selector).fill(text);
    await pause(page, 450);
  }
  async function choose(page, selector, value) {
    const label = await page
      .locator(`${selector} option[value="${value}"]`)
      .textContent();
    await click(
      page,
      page.locator(selector).locator('..').getByRole('combobox'),
    );
    await click(page, page.getByRole('option', { name: label, exact: true }));
  }
  async function go(page, hash = '#discover') {
    await page.goto(runtime.url + '/' + hash);
    await expect(page.locator('#main')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await pause(page, 800);
  }
  async function close(page) {
    if (await page.locator('#dialog').isVisible())
      await click(page, '#dialog [data-action=close]');
  }
  async function note(page, title, text) {
    chapters.at(-1)?.notes.push({ title, text });
    if (!recording) return;
    await page.evaluate(
      ({ title, text }) => {
        document.getElementById('trip-recording-caption')?.remove();
        const el = document.createElement('aside');
        el.id = 'trip-recording-caption';
        el.style.cssText =
          'position:fixed;bottom:24px;left:28px;max-width:690px;background:#213e33;color:#fff;padding:18px 24px;font:17px/1.5 system-ui;box-shadow:0 6px 20px #0002;z-index:2147483647;pointer-events:none;border-left:4px solid #d7ac75';
        const strong = document.createElement('strong');
        strong.style.cssText =
          'display:block;font-size:13px;letter-spacing:.06em;margin-bottom:7px;color:#e5cbaa';
        strong.textContent = title;
        const p = document.createElement('div');
        p.textContent = text;
        el.append(strong, p);
        (document.querySelector('dialog[open]') || document.body).append(el);
      },
      { title, text },
    );
    await pause(page, 5500);
    await page.evaluate(() =>
      document.getElementById('trip-recording-caption')?.remove(),
    );
  }
  async function capture(page, name) {
    await page.evaluate(() =>
      document.getElementById('trip-recording-caption')?.remove(),
    );
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);
    // Complete visible images only; a full catalogue intentionally lazy loads.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((img) => {
            const r = img.getBoundingClientRect();
            // Closed details can retain bounds for transformed lazy photos.
            return img.checkVisibility() && r.bottom > 0 && r.top < innerHeight;
          })
          .map((img) => img.decode().catch(() => undefined)),
      );
    });
    await page.screenshot({ path: join(dir, 'screenshots', name + '.png') });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  // Join with separate cookie jars. Setup is deliberately outside the film so
  // the recording spends its time on travel decisions rather than registration.
  for (const name of actors) {
    const context = await browser.newContext({
      baseURL: runtime.url,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(
      name === 'Ariel' ? runtime.url + '/#setup=' + TEST_KEY : invitation,
    );
    await page.locator('#f-name').fill(name);
    if (name === 'Ariel')
      await page
        .locator('#f-title')
        .fill('We Could Live Here · fictional pilot');
    await page.locator('#auth-form button[type=submit]').click();
    await expect(page.locator('.places-heading')).toBeVisible();
    if (name === 'Ariel') {
      await page.locator('[data-action=settings]:visible').click();
      await page.locator('[data-action=trip-window]').click();
      await page.locator('#f-start').fill('2026-10-03');
      await page.locator('#f-end').fill('2026-10-03');
      await page.locator('#trip-window-form button[type=submit]').click();
      await expect(page.locator('#dialog')).not.toBeVisible();
      await page.locator('[data-action=invite]:visible').first().click();
      invitation = await page.locator('#invite-url').inputValue();
      await page.keyboard.press('Escape');
    }
    // No narration or delays during setup, even for the recorded run.
    await page.locator('[data-action=profile]:visible').first().click();
    await page.locator('#f-bio').fill(bios[name]);
    for (const [i, w] of windows.entries()) {
      await page.locator('[data-action=add-window]').click();
      await page.locator(`#window-${i}-region`).selectOption(w.region);
      await page.locator(`#window-${i}-area`).fill(w.area);
      await page.locator(`#window-${i}-from`).fill(w.from);
      await page.locator(`#window-${i}-to`).fill(w.to);
    }
    await page.locator('#profile-form button[type=submit]').click();
    await expect(page.locator('#dialog')).not.toBeVisible();
    const current = await state(page);
    expect(current.me.name).toBe(name);
    expect(current.me.profile.windows).toHaveLength(1);
    sessions[name] = await context.storageState();
    await context.close();
  }

  async function scene(name, title, fn) {
    const chapter = {
      number: chapters.length + 1,
      actor: name,
      title,
      notes: [],
    };
    chapters.push(chapter);
    const context = await browser.newContext({
      baseURL: runtime.url,
      viewport: { width: 1280, height: 900 },
      storageState: sessions[name],
      ...(recording
        ? {
            recordVideo: {
              dir: join(dir, 'clips'),
              size: { width: 1280, height: 900 },
            },
          }
        : {}),
    });
    // A visible cursor is a recording annotation; it never changes application state.
    if (recording)
      await context.addInitScript(() => {
        addEventListener('DOMContentLoaded', () => {
          const cursor = document.createElement('div');
          cursor.style.cssText =
            'position:fixed;width:16px;height:16px;border:2px solid #234b3c;background:#efcc82b0;border-radius:50%;pointer-events:none;z-index:2147483646;transform:translate(-50%,-50%)';
          document.body.append(cursor);
          addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
          });
          addEventListener('pointerdown', () => {
            cursor.style.scale = '1.5';
          });
          addEventListener('pointerup', () => {
            cursor.style.scale = '1';
          });
        });
      });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(12000);
    try {
      await fn(page);
      await pause(page, 1100);
      expect(errors).toEqual([]);
      sessions[name] = await context.storageState();
      const canonical = await state(page);
      chapter.canonical = canonical;
      chapter.observedAt = new Date().toISOString();
      chapter.plans = canonical.plans.map((p) => ({
        title: p.title,
        date: p.date,
        start: p.start,
        end: p.end,
        kind: p.kind,
        cost: p.cost,
        host: canonical.members.find((m) => m.id === p.hostId)?.name,
        revision: p.revision,
        segments: p.segments.map((x) => ({
          label: x.label,
          start: x.start,
          end: x.end,
          meeting: x.meeting,
        })),
        participants: p.rsvps.map((r) => ({
          name: canonical.members.find((m) => m.id === r.memberId)?.name,
          status: r.status,
          choice: r.choice,
          acceptedRevision: r.acceptedRevision,
        })),
      }));
      chapter.memories = canonical.moments.map((m) => ({
        title: m.title,
        date: m.date,
        visibility: m.visibility,
      }));
    } finally {
      const video = page.video();
      await context.close();
      if (video) {
        const filename = `${String(chapter.number).padStart(2, '0')}-${name.toLowerCase()}.webm`;
        await video.saveAs(join(dir, 'clips', filename));
        await video.delete();
        chapter.video = 'clips/' + filename;
      }
      await writeFile(
        join(dir, 'chapters.json'),
        JSON.stringify(chapters, null, 2),
      );
    }
  }

  async function handshake(name, stage, observation) {
    await writeFile(
      join(dir, `${name.toLowerCase()}-${stage}-observation.json`),
      JSON.stringify(observation, null, 2),
    );
    const path = join(dir, `${name.toLowerCase()}-${stage}-decision.json`);
    for (let i = 0; i < 1800; i++) {
      try {
        return JSON.parse(await readFile(path, 'utf8'));
      } catch {
        // A decision may not exist yet or may still be being written.
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw Error('Agent decision missing: ' + path);
  }
  // Read actual UI and canonical catalogue before independent actors choose.
  for (const name of actors) {
    const context = await browser.newContext({
      baseURL: runtime.url,
      storageState: sessions[name],
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await go(page);
    await click(page, '[data-action=region][data-id=osaka]');
    await writeFile(
      join(dir, `${name.toLowerCase()}-options.json`),
      JSON.stringify(
        {
          ui: await page.locator('body').innerText(),
          catalogue: await page.evaluate(() =>
            window.OMAKASE.catalogue.filter((x) => x.region === 'osaka'),
          ),
          canonical: await state(page),
        },
        null,
        2,
      ),
    );
    await context.close();
  }
  await writeFile(
    join(dir, 'READY'),
    'Four separate synthetic accounts ready.',
  );
  for (const name of actors) {
    const decision = await handshake(name, 'initial', {
      options: `${name.toLowerCase()}-options.json`,
      prompt:
        'Choose one ordinary Tuesday interest. Explicit choices only; no purchase or attendance proof.',
    });
    await scene(
      name,
      decision.chapterTitle || name + ' chooses an afternoon',
      async (page) => {
        await go(page);
        await note(
          page,
          name.toUpperCase() + ' · INDEPENDENT AGENT CHOICE',
          decision.intent,
        );
        if (decision.discoveryId) {
          await click(page, '[data-action=region][data-id=osaka]');
          const chosen = await page.evaluate(
            (id) => window.OMAKASE.catalogue.find((x) => x.id === id),
            decision.discoveryId,
          );
          await fill(page, '#search', chosen.title);
          await click(
            page,
            `[data-action=discovery][data-id="${decision.discoveryId}"]`,
          );
          await capture(page, name.toLowerCase() + '-chosen-place');
          await note(page, 'CATALOGUE IDEA · NOT A BOOKING', decision.reason);
          await close(page);
        }
        await click(page, '[data-action=plan-new]:visible');
        await fill(page, '#f-title', decision.title);
        await choose(page, '#f-region', 'osaka');
        await fill(page, '#f-area', decision.area);
        await click(page, '.trip-day-picker > summary');
        await fill(page, '#f-date', '2026-10-03');
        await click(page, '.trip-day-picker > summary');
        await fill(page, '#f-start', decision.start);
        await fill(page, '#f-end', decision.end);
        await fill(page, '#f-meeting', decision.meeting);
        await click(page, '.plan-extra > summary');
        await choose(page, '#f-kind', 'idea');
        await fill(
          page,
          '#f-description',
          decision.description +
            ' Fictional pilot: proposal only. No visit, purchase or booking occurred.',
        );
        await capture(page, name.toLowerCase() + '-draft');
        await click(page, '#plan-form button[type=submit]');
        await expect(page.locator('.host-actions')).toBeVisible();
        await capture(page, name.toLowerCase() + '-published');
        await note(
          page,
          'AN INVITATION, NOT AN OBLIGATION',
          decision.afterword,
        );
      },
    );
  }
  const context = await browser.newContext({
    baseURL: runtime.url,
    storageState: sessions.Ariel,
  });
  const page = await context.newPage();
  await go(page);
  await writeFile(
    join(dir, 'group-options.json'),
    JSON.stringify(await state(page), null, 2),
  );
  await context.close();
  await writeFile(
    join(dir, 'GROUP_READY'),
    'Invitations ready for independent RSVP decisions.',
  );
  for (const name of actors) {
    const decision = await handshake(name, 'response', {
      state: 'group-options.json',
      prompt:
        'Choose explicitly whether to join another invitation or remain independent.',
    });
    await scene(name, name + ' decides what to share', async (page) => {
      if (decision.planTitle) {
        const cur = await state(page);
        decision.planId = cur.plans.find(
          (x) => x.title === decision.planTitle,
        )?.id;
        if (!decision.planId) throw Error('Prior chosen invitation missing');
      }
      await go(page, decision.planId ? '#plan=' + decision.planId : '#day');
      await note(
        page,
        name.toUpperCase() + ' · THE SHARED AFTERNOON',
        decision.intent,
      );
      if (decision.planId && decision.comment) {
        await fill(page, '#comment-text', decision.comment);
        await click(page, '#comment-form button[type=submit]');
        await expect(page.locator('#dialog')).toContainText(decision.comment);
      }
      if (decision.planId && decision.status) {
        await click(page, '#rsvp-form button[value=' + decision.status + ']');
        await expect(page.locator('#dialog')).toBeVisible();
      }
      await capture(page, name.toLowerCase() + '-response');
      await note(
        page,
        'THE EDITOR DOES NOT GET THE LAST WORD',
        decision.correction,
      );
    });
  }
  const dinner = await handshake('ariel', 'dinner-proposal', {
    preferences: '../*-dinner-preference.json',
  });
  await scene('Ariel', 'A table, if we can find one', async (page) => {
    await go(page);
    await note(page, 'ARIEL · AN OPTIONAL SHARED ANCHOR', dinner.intent);
    await click(page, '[data-action=plan-new]:visible');
    await fill(page, '#f-title', dinner.title);
    await choose(page, '#f-region', 'osaka');
    await fill(page, '#f-area', dinner.area);
    await click(page, '.trip-day-picker > summary');
    await fill(page, '#f-date', '2026-10-03');
    await click(page, '.trip-day-picker > summary');
    await fill(page, '#f-start', dinner.start);
    await fill(page, '#f-end', dinner.end);
    await fill(page, '#f-meeting', dinner.meeting);
    await click(page, '.plan-extra > summary');
    await choose(page, '#f-kind', 'idea');
    await fill(page, '#f-description', dinner.description);
    await capture(page, 'dinner-proposal-draft');
    await click(page, '#plan-form button[type=submit]');
    await expect(page.locator('.host-actions')).toBeVisible();
    await capture(page, 'dinner-invitation');
    await note(page, 'INTEREST IS NOT AN RSVP', dinner.afterword);
  });
  {
    const c = await browser.newContext({
      baseURL: runtime.url,
      storageState: sessions.Ariel,
    });
    const p = await c.newPage();
    await go(p);
    await writeFile(
      join(dir, 'dinner-state.json'),
      JSON.stringify(await state(p), null, 2),
    );
    await c.close();
  }
  await writeFile(
    join(dir, 'DINNER_READY'),
    'Actual optional dinner invitation ready.',
  );
  for (const name of actors.filter((n) => n !== 'Ariel')) {
    const decision = await handshake(name, 'dinner', {
      state: 'dinner-state.json',
      prompt:
        'Explicitly accept, be interested, or decline actual optional dinner.',
    });
    await scene(name, name + ' answers the dinner invitation', async (page) => {
      const current = await state(page);
      const currentDinner = current.plans.find(
        (plan) => plan.title === dinner.title,
      );
      if (!currentDinner) throw Error('Dinner invitation missing for replay');
      await go(page, '#plan=' + currentDinner.id);
      await note(
        page,
        name.toUpperCase() + ' · DINNER IS STILL A CHOICE',
        decision.intent,
      );
      if (decision.status)
        await click(page, '#rsvp-form button[value=' + decision.status + ']');
      await capture(page, name.toLowerCase() + '-dinner');
      await note(page, 'A PLAN, NOT PROOF OF A MEAL', decision.afterword);
    });
  }
  await writeFile(join(dir, 'COMPLETE'), 'Pilot interactions complete.');
});
