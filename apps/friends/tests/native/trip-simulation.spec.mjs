import { test, expect, TEST_KEY } from './runtime.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

// These are fictional travelers. Every trip, profile, plan, RSVP and memory is
// created through the real browser UI against the isolated workerd fixture.
// RECORD_TRIP=1 adds watchable pacing, annotations and one video per chapter.
const recording = process.env.RECORD_TRIP === '1';
const output = process.env.TRIP_RECORDING_DIR;
const state = async (page) => (await page.request.get('/api/state')).json();
const actors = ['Ariel', 'Mei', 'Jules', 'Priya'];
const bios = {
  Ariel:
    '35. Hamilton editor. Slow mornings, seated lunches, distinctive detours. Spontaneous, with a way home.',
  Mei: '33. Slow mornings. Very available for cake; less available for an early start.',
  Jules: '36. Records, secondhand clothes and a good afternoon on my own.',
  Priya:
    '35. Ceramics, market lunches and a small notebook full of things to make.',
};
const windows = [
  {
    region: 'osaka',
    area: 'Nakanoshima / Kitahama',
    from: '2026-10-03',
    to: '2026-10-04',
  },
  {
    region: 'tokyo',
    area: 'Yanaka / Shimokitazawa',
    from: '2026-10-05',
    to: '2026-10-06',
  },
  { region: 'okinawa', area: 'Naha', from: '2026-10-07', to: '2026-10-09' },
];

test('four friends make independent days, join selected stops, reconfirm changes and keep a voluntary trip journal', async ({
  browser,
  runtime,
}, info) => {
  test.setTimeout(recording ? 600000 : 180000);
  if (recording && !output)
    throw Error('TRIP_RECORDING_DIR is required for a recording.');
  const dir = output ? resolve(output) : info.outputPath('simulation');
  await mkdir(join(dir, 'clips'), { recursive: true });
  await mkdir(join(dir, 'screenshots'), { recursive: true });
  const sessions = {},
    chapters = [],
    checks = [],
    plans = {};
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
      await page.locator('#f-title').fill('Japan, our own pace · simulation');
    await page.locator('#auth-form button[type=submit]').click();
    await expect(page.locator('.places-heading')).toBeVisible();
    if (name === 'Ariel') {
      await page.locator('[data-action=settings]:visible').click();
      await page.locator('[data-action=trip-window]').click();
      await page.locator('#f-start').fill('2026-10-03');
      await page.locator('#f-end').fill('2026-10-09');
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
    expect(current.me.profile.windows).toHaveLength(3);
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
  async function collection(page, region, id) {
    await go(page);
    if (!(await page.locator('.places-stories').evaluate((el) => el.open)))
      await click(page, '.places-stories > summary');
    await click(page, `[data-action=home-region][data-id=${region}]`);
    await click(
      page,
      `.home-menu [data-action=collection-story][data-id=${id}]`,
    );
    await expect(page.locator('.collection-story')).toBeVisible();
  }
  async function draft(page, { date, start, note: message, cost }) {
    await click(page, '#dialog [data-action=plan-collection]');
    await fill(page, '#outing-date', date);
    await fill(page, '#outing-start', start);
    if (message) await fill(page, '#outing-note', message);
    if (cost) await fill(page, '#outing-cost', cost);
  }
  async function reviewAndPublish(page, meetings, key) {
    const before = (await state(page)).plans.length;
    await click(page, '[data-outing=review]');
    await expect(page.locator('#outing-review')).toBeVisible();
    await expect(page.locator('#plan-form')).toHaveCount(0);
    expect((await state(page)).plans).toHaveLength(before);
    for (const [id, meeting] of Object.entries(meetings))
      await fill(page, `[data-review-meeting="${id}"]`, meeting);
    await capture(page, key + '-review');
    await click(page, '[data-outing=publish]');
    await expect(page.locator('.host-actions')).toBeVisible();
    const current = await state(page);
    expect(current.plans).toHaveLength(before + 1);
    const made = current.plans.find(
      (p) => !Object.values(plans).includes(p.id) && p.hostId === current.me.id,
    );
    expect(made).toBeTruthy();
    plans[key] = made.id;
    return made;
  }

  await scene('Ariel', 'A few hours worth remembering', async (page) => {
    await go(page);
    await note(
      page,
      'FICTIONAL TRIP · REAL APP INTERACTIONS',
      'I’m Ariel, 35. Four friends, seven days in Japan. We share a trip, but we don’t need to share every hour.',
    );
    await expect(page.locator('.home-menu > article')).toHaveCount(3);
    await capture(page, '01-explore-osaka');
    if (!(await page.locator('.places-stories').evaluate((el) => el.open)))
      await click(page, '.places-stories > summary');
    await click(page, '.home-dice-actions [data-action=home-roll]');
    await click(page, '#dice-form [type=submit]');
    await expect(page.locator('#dice-result h3')).toBeVisible();
    const first = await page.locator('#dice-result h3').innerText();
    await note(
      page,
      'OSAKA · A LITTLE SURPRISE',
      'A roll gives us a place to explore. We still check its source, opening and prices before setting out.',
    );
    await click(page, '#dice-form [type=submit]');
    await expect(page.locator('#dice-result h3')).not.toHaveText(first);
    await click(page, '[data-action=dice-undo]');
    await expect(page.locator('#dice-result h3')).toHaveText(first);
    await click(page, '[data-action=dice-save]');
    await expect(page.locator('#dice-result')).toContainText('Saved');
    await capture(page, '02-dice-reveal');
    await page.locator('#dialog [data-action=close]').click();
    checks.push(
      'A second roll differs, undo restores the first, and saving keeps a private pick.',
    );
  });
  await scene('Ariel', 'Osaka: river light and cake', async (page) => {
    await collection(page, 'osaka', 'osaka-river-and-cake');
    await note(
      page,
      'OCTOBER 3 · NORA',
      'River light, a little architecture, then cake. Two and a half hours feels like a good afternoon—not an obligation.',
    );
    await draft(page, {
      date: '2026-10-03',
      start: '14:00',
      note: 'Come for the walk, just the cake, or neither. We’ll compare notes at dinner.',
      cost: 'Up to ¥2,000 each for cake and a drink · our budget, not a venue quote',
    });
    await fill(
      page,
      '#outing-fallback',
      'If we are tired or it rains, skip the walk and confirm the cake stop separately.',
    );
    await expect(page.locator('[data-outing-preview]')).toContainText(
      '14:00–16:30',
    );
    await note(
      page,
      'ONE EDITOR, THEN AN INVITATION',
      'The timing matches the story. I can shorten a stop here; review only asks for the exact meeting places we still need.',
    );
    const p = await reviewAndPublish(
      page,
      {
        'osaka-011':
          'Osaka City Central Public Hall, main public entrance — simulation meeting point',
        'osaka-056':
          'GOKAN Kitahama main shop, street entrance — simulation meeting point',
      },
      'osaka',
    );
    expect(p.end).toBe('16:30');
    expect(p.segments[1].start).toBe('15:45');
    expect(p.cost).toContain('our budget');
    await capture(page, '03-osaka-invitation');
    checks.push(
      'Story timing matches the published plan; meeting points and spending context survive review.',
    );
  });
  await scene('Mei', 'Mei joins just the cake', async (page) => {
    await go(page, '#plan=' + plans.osaka);
    await note(
      page,
      'OCTOBER 3 · MEI',
      'Mei wants a slow morning and a longer lunch. She joins the cake at 15:45, with no promise to make the river walk.',
    );
    await click(page, 'input[name=choice][value="outing-osaka-056"]');
    await click(page, '#rsvp-form button[value=joined]');
    await expect(page.locator('#rsvp-form')).toContainText('Update my part');
    const s = await state(page),
      p = s.plans.find((p) => p.id === plans.osaka);
    expect(p.rsvps.find((r) => r.memberId === s.me.id).choice).toBe(
      'outing-osaka-056',
    );
    await close(page);
    await click(page, '[data-nav=day]:visible');
    await expect(page.locator('.commitment')).toContainText('15:45');
    await expect(page.locator('.commitment')).not.toContainText('14:00');
    await capture(page, '04-mei-own-day');
    await note(
      page,
      'ONLY HER COMMITMENT',
      'Her calendar contains just the part she chose. Sharing a trip doesn’t quietly fill everybody’s day.',
    );
    checks.push(
      'Mei’s canonical RSVP and calendar contain only the cake segment.',
    );
  });
  await scene('Ariel', 'A meeting point changes', async (page) => {
    await go(page, '#plan=' + plans.osaka);
    await click(page, '[data-action=plan-edit]');
    await click(page, '.plan-extra > summary');
    await fill(
      page,
      '[data-segment="outing-osaka-056"] [data-seg=meeting]',
      'GOKAN Kitahama main shop, outside the street entrance beside the sign — revised simulation meeting point',
    );
    await click(page, '#plan-form button[type=submit]');
    await expect(page.locator('.host-actions')).toBeVisible();
    await note(
      page,
      'A CHANGE IS A NEW DECISION',
      'I make the cake meeting point more precise. Mei’s earlier yes is now marked for reconfirmation.',
    );
    const s = await state(page),
      p = s.plans.find((p) => p.id === plans.osaka);
    expect(p.rsvps[0].acceptedRevision).not.toBe(p.revision);
  });
  await scene('Mei', 'Mei checks the changed invitation', async (page) => {
    await go(page, '#plan=' + plans.osaka);
    await expect(page.locator('#dialog')).toContainText('Review what changed');
    await capture(page, '05-reconfirmation');
    await note(
      page,
      'MEI · REVIEW THE CHANGE',
      'She sees the revised meeting place and explicitly confirms it. The app doesn’t assume a changed invitation still suits her.',
    );
    await click(page, '#rsvp-form button[value=joined]');
    const s = await state(page),
      p = s.plans.find((p) => p.id === plans.osaka);
    expect(p.rsvps.find((r) => r.memberId === s.me.id).acceptedRevision).toBe(
      p.revision,
    );
    const downloadPromise = page.waitForEvent('download');
    await click(page, '[data-action=download-day-sheet]');
    const download = await downloadPromise;
    await download.saveAs(join(dir, 'osaka-day-sheet.html'));
    const sheet = await readFile(join(dir, 'osaka-day-sheet.html'), 'utf8');
    expect(sheet).toContain('Offline copy');
    expect(sheet).not.toContain('#join=');
    checks.push(
      'A host edit invalidates the old RSVP; reconfirmation accepts the new revision; offline sheet excludes access links.',
    );
  });
  await scene('Ariel', 'Osaka: the head spa from the reel', async (page) => {
    await go(page);
    await note(
      page,
      'OCTOBER 4 · ARIEL',
      'The reel tags MOD Total Beauty Salon. The 60-minute course fits my separate indulgence budget; 90 minutes does not. Mei prefers to keep her money for dinner.',
    );
    await click(page, '[data-action=plan-new]:visible');
    await fill(page, '#f-title', 'MOD head spa: one hour, if confirmed');
    await choose(page, '#f-region', 'osaka');
    await fill(page, '#f-area', 'Nippombashi · MOD Total Beauty Salon');
    await click(page, '.trip-day-picker > summary');
    await fill(page, '#f-date', '2026-10-04');
    await click(page, '.trip-day-picker > summary');
    await fill(page, '#f-start', '14:00');
    await fill(page, '#f-end', '15:30');
    await fill(
      page,
      '#f-meeting',
      'MOD, August Building II 3F, 1-4-16 Nippombashi, Chuo-ku, Osaka — proposed simulation meeting point',
    );
    await click(page, '.plan-extra > summary');
    await choose(page, '#f-kind', 'idea');
    await fill(
      page,
      '#f-description',
      'The exact reel tags MOD: https://www.instagram.com/reels/Dcp09adJD2m/ . Considering the 60-minute basic course; the 90-minute window includes a planning buffer, not confirmed service duration. Ask the salon about availability, final price, drying time, language support and cancellation terms. No appointment has been booked. Official menu checked September 10, 2026: https://mod-beauty.jp/ . Mei is skipping this expense; no group booking.',
    );
    await click(page, '.plan-extra details > summary');
    await fill(
      page,
      '#f-cost',
      'Listed 60-minute course ¥14,000; my separate ceiling ¥18,000. Final price and appointment unconfirmed.',
    );
    await capture(page, 'mod-draft');
    await click(page, '#plan-form button[type=submit]');
    await expect(page.locator('.host-actions')).toBeVisible();
    const s = await state(page),
      p = s.plans.find((p) => p.title.startsWith('MOD head'));
    expect(p.kind).toBe('idea');
    expect(p.rsvps).toHaveLength(0);
    plans.mod = p.id;
    await capture(page, 'mod-invitation');
    await note(
      page,
      'ROOM AROUND AN INDULGENCE',
      'I keep this as an idea, not a confirmed appointment. The 30-minute buffer belongs to my plan. A saved invitation cannot reserve the salon.',
    );
    checks.push(
      'The verified MOD venue becomes a tentative invitation with sourced course price, separate personal budget and no invented appointment or treatment.',
    );
  });
  await scene(
    'Ariel',
    'Tokyo: buying glasses starts with a question',
    async (page) => {
      await go(page);
      await note(
        page,
        'OCTOBER 5 · ARIEL',
        'Jules wants vintage shops. I want glasses I will wear at home. I allow a morning for JINS, then leave a proper lunch gap.',
      );
      await click(page, '[data-action=plan-new]:visible');
      await fill(page, '#f-title', 'JINS: frames, a measurement, then decide');
      await choose(page, '#f-region', 'tokyo');
      await fill(page, '#f-area', 'Tokyo Station · Gransta Yaesu');
      await click(page, '.trip-day-picker > summary');
      await fill(page, '#f-date', '2026-10-05');
      await click(page, '.trip-day-picker > summary');
      await fill(page, '#f-start', '10:15');
      await fill(page, '#f-end', '11:30');
      await fill(
        page,
        '#f-meeting',
        'JINS Tokyo Station Gransta Yaesu, storefront outside the ticket gates — proposed simulation meeting point',
      );
      await click(page, '.plan-extra > summary');
      await choose(page, '#f-kind', 'idea');
      await fill(
        page,
        '#f-description',
        'I am considering frames and an eyewear vision measurement, not a comprehensive medical eye exam. Ask about prescription suitability, lens stock, total cost and collection date before ordering. I leave Tokyo October 7, so no purchase if collection is uncertain. Mei may browse but has made no commitment. Official source checked September 10, 2026: https://www.gransta.jp/mall/gransta_yaesu/jins/',
      );
      await click(page, '.plan-extra details > summary');
      await fill(
        page,
        '#f-cost',
        'My ceiling ¥20,000, not a quote. No purchase or appointment made.',
      );
      await capture(page, 'jins-draft');
      await click(page, '#plan-form button[type=submit]');
      await expect(page.locator('.host-actions')).toBeVisible();
      const s = await state(page),
        p = s.plans.find((p) => p.title.startsWith('JINS:'));
      expect(p.kind).toBe('idea');
      expect(p.cost).toContain('No purchase');
      plans.jins = p.id;
      await capture(page, 'jins-invitation');
      await note(
        page,
        'A PLAN IS NOT A PURCHASE',
        'The app keeps the errand and the budget. It cannot tell me whether my lenses are in stock. The simulated outcome stays undecided; I will not invent a checkout.',
      );
      checks.push(
        'A tentative JINS errand preserves its budget and unresolved lens-stock decision without inventing a booking or purchase.',
      );
    },
  );
  await scene('Jules', 'Tokyo: an afternoon of my own', async (page) => {
    await collection(page, 'tokyo', 'tokyo-shimokita-afternoon');
    await note(
      page,
      'OCTOBER 5 · JULES',
      'Jules goes looking for vintage clothes and records in Shimokitazawa. The rest of us don’t have to want the same afternoon.',
    );
    await draft(page, {
      date: '2026-10-05',
      start: '13:00',
      note: 'I’m browsing vintage shops and records. Come along if it appeals; I’m happy wandering on my own.',
    });
    await reviewAndPublish(
      page,
      {
        'tokyo-029':
          'Shimokitazawa Station, east exit — simulation meeting point',
      },
      'tokyo-jules',
    );
    await capture(page, '06-jules-tokyo');
  });
  await scene('Ariel', 'Tokyo: old lanes and red gates', async (page) => {
    await collection(page, 'tokyo', 'tokyo-yanaka-slow');
    await note(
      page,
      'OCTOBER 5 · NORA',
      'I choose Yanaka and Nezu instead. This is an editorial route to check, with room for one good snack along the way.',
    );
    await draft(page, {
      date: '2026-10-05',
      start: '13:00',
      note: 'A gentle walk. Nezu is the optional second stop; I’ll message in the invitation if we linger.',
    });
    await reviewAndPublish(
      page,
      {
        'tokyo-021':
          'Yuyake Dandan steps, upper landing — simulation meeting point',
        'tokyo-023':
          'Nezu Shrine, main public entrance — simulation meeting point',
      },
      'tokyo-ariel',
    );
    await close(page);
    await click(page, '[data-nav=people]:visible');
    await choose(page, '#friends-day', '2026-10-05');
    await expect(page.locator('.overlap-day')).toContainText('Vintage racks');
    await expect(page.locator('.overlap-day')).toContainText('Old lanes');
    await capture(page, '07-friends-cross-paths');
    await note(
      page,
      'TOGETHER, APART',
      'Both invitations are here. Our shared Tokyo dates help us plan a later meetup; they don’t tell us who is nearby or free.',
    );
    const s = await state(page);
    expect(
      s.plans
        .find((p) => p.id === plans['tokyo-jules'])
        .rsvps.some((r) => r.memberId === s.me.id && r.status === 'joined'),
    ).toBe(false);
    checks.push(
      'Independent Tokyo invitations coexist without auto-enrollment or inferred availability.',
    );
  });
  await scene('Priya', 'Naha: find a bowl, then lunch', async (page) => {
    await collection(page, 'okinawa', 'naha-pottery-and-lunch');
    await note(
      page,
      'OCTOBER 8 · PRIYA',
      'Priya leads this one: pottery browsing in Tsuboya, then a market lunch. Making pottery would need its own workshop booking.',
    );
    await draft(page, {
      date: '2026-10-08',
      start: '10:00',
      note: 'Jules suggested a beach; I want time with pottery. I will lead this morning. Lunch at noon is the shared anchor, and browsing is optional. We will agree food and cooking prices before buying anything at the market.',
    });
    const p = await reviewAndPublish(
      page,
      {
        'okinawa-006':
          'Tsuboya Pottery Museum, public entrance — simulation meeting point',
        'okinawa-048':
          'Makishi Public Market, main ground-floor entrance — simulation meeting point',
      },
      'naha',
    );
    expect(p.segments[1].start).toBe('12:00');
    await capture(page, '08-naha-invitation');
  });
  await scene('Ariel', 'Naha: meet me for lunch', async (page) => {
    await go(page, '#plan=' + plans.naha);
    await note(
      page,
      'OCTOBER 8 · NORA',
      'Priya wants every pottery shop; Jules floated a beach day. I want neither a long transfer nor another morning keeping time. We disagree, then I join only the noon lunch.',
    );
    await click(page, 'input[name=choice][value="outing-okinawa-048"]');
    await click(page, '#rsvp-form button[value=joined]');
    await expect(page.locator('#rsvp-form')).toContainText('Update my part');
    await close(page);
    await click(page, '[data-nav=day]:visible');
    await expect(page.locator('.commitment')).toContainText('12:00');
    await capture(page, '09-ariel-lunch-day');
  });
  await scene('Priya', 'A page for our shared trip book', async (page) => {
    await go(page, '#plan=' + plans.naha);
    await click(page, '[data-action=moment-plan]');
    await fill(page, '#f-title', 'The bowl I would have carried home');
    await fill(
      page,
      '#memory-text',
      'Fictional trip diary: I spent the morning comparing glazes in Tsuboya. Ariel joined at the market, and we took our time over lunch. This reference photograph is not a photo from our imagined trip. Photo: Hajime NAKANO, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/). Source: https://commons.wikimedia.org/wiki/File:Tsuboya_Yachimun_Street.jpg',
    );
    // A credited reference photograph exercises the real image upload path.
    const photo = resolve('public/assets/discovery/photos/okinawa-006.webp');
    await page.locator('#memory-photo').setInputFiles(photo);
    await expect(page.locator('#photo-preview img')).toHaveCount(1);
    await expect(
      page.locator('#moment-form button[type=submit]'),
    ).toBeEnabled();
    await expect(page.locator('#memory-visibility')).toHaveValue('group');
    await click(page, '#moment-form button[type=submit]');
    await expect(page.locator('.memory')).toContainText('The bowl');
    await note(
      page,
      'ONE PHOTO, ONE SMALL STORY',
      'Priya chooses to share a page. The image is a credited reference photo for this simulation, not evidence that we travelled.',
    );
    await capture(page, '10-shared-memory');
    checks.push(
      'A user-authored shared memory and uploaded reference image reach the canonical trip book.',
    );
  });
  await scene('Ariel', 'Some pages are only for me', async (page) => {
    await go(page, '#story');
    await click(page, '[data-action=moment-new]:visible');
    await fill(page, '#f-title', 'A morning I did not need to explain');
    await fill(
      page,
      '#memory-text',
      'Fictional private diary: At 35, a quiet morning feels like a good use of a trip. I can love my friends and still need a little time alone.',
    );
    await fill(page, '#f-date', '2026-10-09');
    await choose(page, '#memory-visibility', 'private');
    await note(
      page,
      'OCTOBER 9 · ONLY ME',
      'I keep this page private. The group gets the stories I choose to share, not every thought I have on the trip.',
    );
    await click(page, '#moment-form button[type=submit]');
    await expect(page.locator('.memory.private')).toContainText('A morning');
    await capture(page, '11-private-journal');
    const s = await state(page);
    expect(
      s.moments.find((m) => m.title === 'A morning I did not need to explain')
        .visibility,
    ).toBe('private');
    await click(page, '[data-action=story-filter][data-id=group]');
    await expect(page.locator('.memory')).toContainText('The bowl');
    await expect(page.locator('.memory')).not.toContainText('A morning');
    await note(
      page,
      'THE RETURN EDITION',
      'We leave with different days and a shared book. The simulation checks the app; opening hours, journeys and reservations still need real-world confirmation.',
    );
    await capture(page, '12-return-edition');
  });
  // Verify visibility from another authenticated member, including direct photo access.
  const verifyContext = await browser.newContext({
    baseURL: runtime.url,
    storageState: sessions.Mei,
    viewport: { width: 390, height: 844 },
  });
  const verifyPage = await verifyContext.newPage();
  try {
    await go(verifyPage, '#story');
    const s = await state(verifyPage);
    expect(s.members).toHaveLength(4);
    expect(s.plans).toHaveLength(6);
    expect(s.moments).toHaveLength(1);
    expect(s.moments[0].title).toBe('The bowl I would have carried home');
    await capture(verifyPage, '13-memories-phone');
    await go(verifyPage, '#plan=' + plans.osaka);
    await capture(verifyPage, '14-invitation-phone');
    await close(verifyPage);
    await click(verifyPage, '.nav-dock [data-nav=people]');
    await choose(verifyPage, '#friends-day', '2026-10-05');
    await verifyPage.evaluate(() => scrollTo(0, 0));
    expect(
      (
        await verifyPage
          .locator('.overlap-day [data-action=plan-detail]')
          .first()
          .boundingBox()
      ).y,
    ).toBeLessThan(700);
    await capture(verifyPage, '15-friends-phone');
    await go(verifyPage);
    await capture(verifyPage, '16-explore-phone');
    checks.push(
      'Another member receives the shared page but no private journal entry; all four travelers and six invitations persist.',
    );
  } finally {
    await verifyContext.close();
  }
  await writeFile(
    join(dir, 'acceptance.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        fictional: true,
        runtime: 'isolated local workerd with D1 and R2',
        sourceHashes: Object.fromEntries(
          await Promise.all(
            [
              'public/app.js',
              'public/app.css',
              'public/outings.js',
              'public/data.js',
              'tests/native/trip-simulation.spec.mjs',
            ].map(async (file) => [
              file,
              createHash('sha256')
                .update(await readFile(file))
                .digest('hex'),
            ]),
          ),
        ),
        actors,
        tripDates: { from: '2026-10-03', to: '2026-10-09' },
        checks,
        limitations: [
          'No real travel occurred.',
          'Reference photos are credited, not personal travel photographs.',
          'No provider, opening-hours, booking or physical-device availability is asserted.',
        ],
      },
      null,
      2,
    ),
  );
});
