import { test, expect } from './runtime.mjs';

test.use({ hasTouch: true });

async function openDice(page, url) {
  await page.goto(url + '/example.html#demo/discover');
  if (!(await page.locator('.places-stories').evaluate((el) => el.open)))
    await page.locator('.places-stories > summary').click();
  await page.locator('.home-dice-actions [data-action=home-roll]').click();
  await expect(page.locator('#dialog')).toHaveClass(/chance-dialog/);
}
async function preferences(page, region, area) {
  await page
    .getByRole('button', { name: 'Change preferences', exact: true })
    .click();
  await page.locator('#dice-region').selectOption(region);
  await page.locator('#dice-area').selectOption(area);
}

test('chance room accepts a fling, reveals a real eligible place and can save, undo and inspect it', async ({
  page,
  runtime,
}, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1344, height: 960 });
  await openDice(page, runtime.url);
  await expect(page.locator('.chance-portal')).toHaveCount(4);
  await expect(page.locator('.chance-sound')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const die = await page.locator('.dice-table').boundingBox();
  await page.mouse.move(die.x + 80, die.y + 60);
  await page.mouse.down();
  await page.mouse.move(die.x + 180, die.y + 20, { steps: 8 });
  await expect(page.locator('.dice-atlas')).toHaveAttribute(
    'data-phase',
    'held',
  );
  await page.mouse.up();
  await expect(page.locator('#dice-form')).toHaveAttribute(
    'data-rolling',
    'true',
  );
  await expect(page.locator('#dice-form [type=submit]')).toBeDisabled();
  await expect(page.locator('#dialog')).toHaveAttribute(
    'data-chance',
    'revealed',
  );
  await expect(page.locator('#dice-result')).toBeFocused();
  const first = await page.locator('#dice-result h3').innerText();
  const picked = await page.locator('.chance-go').getAttribute('data-id');
  const record = await page.evaluate(
    (id) => window.OMAKASE.catalogue.find((a) => a.id === id),
    picked,
  );
  expect(record.area).toBe('Namba');
  expect(record.minutes).toBeLessThanOrEqual(180);
  expect(record.flags).not.toMatch(/[bodw]/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-result h3')).not.toHaveText(first);
  await page
    .getByRole('button', { name: 'Previous roll', exact: true })
    .click();
  await expect(page.locator('#dice-result h3')).toHaveText(first);
  await page
    .getByRole('button', { name: 'Save for later', exact: false })
    .click();
  await expect(page.locator('[data-action=dice-save]')).toContainText('Saved');
  await page.setViewportSize({ width: 393, height: 852 });
  await page.screenshot({ path: info.outputPath('chance-result-phone.png') });
  await expect(page.locator('.chance-go')).toBeInViewport();
  await page.locator('.chance-go').click();
  await expect(page.locator('#dialog')).not.toHaveClass(/chance-dialog/);
  await expect(page.locator('#dialog [data-action=plan-from]')).toHaveAttribute(
    'data-id',
    picked,
  );
  expect(errors).toEqual([]);
});

test('chance room recovers from cancellation and photo failure, and keyboard draws work with reduced motion', async ({
  page,
  runtime,
}, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 620 });
  await openDice(page, runtime.url);
  await page.locator('.dice-table').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dice-form')).toHaveAttribute(
    'data-rolling',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).not.toHaveAttribute('open');
  await expect(
    page.locator('.home-dice-actions [data-action=home-roll]'),
  ).toBeFocused();
  await page.route('**/assets/discovery/photos/**', (r) => r.abort());
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDice(page, runtime.url);
  await preferences(page, 'osaka', 'Namba');
  await page.locator('#dice-mood').selectOption('Architecture');
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await page.locator('.dice-table').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialog')).toHaveAttribute(
    'data-chance',
    'revealed',
  );
  await expect(page.locator('#dice-result h3')).toHaveText(
    'Namba Yasaka lion-head stage',
  );
  await expect(page.locator('.chance-photo')).toHaveClass(
    /chance-photo-missing/,
  );
  await expect(page.locator('.chance-go')).toBeInViewport();
  await page.screenshot({
    path: info.outputPath('chance-missing-photo-short-phone.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('.chance-practical summary').click();
  await expect(page.locator('#dice-result .journey-context')).toContainText(
    'plus travel',
  );
  expect(errors).toEqual([]);
});

test('empty shortlist keeps adventurous opt-ins explicit and recovers without stranding the die', async ({
  page,
  runtime,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 393, height: 852 });
  await openDice(page, runtime.url);
  await preferences(page, 'osaka', 'Hyogo: Himeji');
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await expect(page.locator('.dice-table')).toBeDisabled();
  await expect(page.locator('.dice-empty')).toContainText(
    'regional excursions',
  );
  await expect(page.locator('#dice-arranged')).not.toBeChecked();
  await page.screenshot({ path: info.outputPath('chance-empty-phone.png') });
  await page
    .getByRole('button', { name: 'Include these ideas and roll' })
    .click();
  await expect(page.locator('#dice-result')).toContainText(
    'Himeji almond-butter toast',
  );
  await expect(page.locator('#dice-arranged')).toBeChecked();
  await expect(page.locator('.chance-qualifications')).toBeVisible();
  await expect(page.locator('.chance-qualifications')).toContainText(
    'Regional excursion',
  );
  await expect(page.locator('.chance-practical')).not.toHaveAttribute('open');
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-result')).toContainText('Fresh round');
  await expect(page.locator('#dice-preferences')).toBeHidden();
});

test('sound requires explicit opt-in and its audio context closes with the chance room', async ({
  page,
  runtime,
}) => {
  await page.addInitScript(() => {
    window.__chanceAudio = { created: 0, closed: 0 };
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio)
      window.AudioContext = class extends Audio {
        constructor(...args) {
          super(...args);
          window.__chanceAudio.created++;
        }
        close() {
          window.__chanceAudio.closed++;
          return super.close();
        }
      };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDice(page, runtime.url);
  await page.locator('.dice-table').tap();
  expect((await page.evaluate(() => window.__chanceAudio)).created).toBe(0);
  await page.locator('#dice-form [type=submit]').click();
  await page.getByRole('button', { name: 'Change preferences' }).click();
  await page.locator('#dice-area').selectOption('Karahori & Tanimachi');
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.locator('.chance-sound')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await page.evaluate(() => window.__chanceAudio)).created).toBe(1);
  await page.keyboard.press('Escape');
  expect((await page.evaluate(() => window.__chanceAudio)).closed).toBe(1);
});

test('missing photographs never borrow a neighbouring venue and presentation failure still reveals the draw', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 320, height: 620 });
  await openDice(page, runtime.url);
  // Leave exactly one eligible, deliberately unillustrated real Namba record.
  const title = await page.evaluate(() => {
    const records = window.OMAKASE.catalogue.filter(
      (a) => a.region === 'osaka' && a.area === 'Namba',
    );
    const target = records.find((a) => !/[bodw]/.test(a.flags));
    delete target.photo;
    for (const a of records) if (a !== target) a.minutes = 999;
    return target.title;
  });
  await preferences(page, 'osaka', 'Namba');
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('.dice-atlas')).toHaveAttribute(
    'data-phase',
    'travelling',
  );
  await expect(page.locator('.chance-destination img')).toHaveCount(0);
  await expect(page.locator('#dice-result h3')).toHaveText(title);
  await expect(page.locator('.chance-no-photo')).toContainText(
    'No verified photo of this place yet.',
  );
  await expect(page.locator('.chance-photo img')).toHaveCount(0);
  await expect(page.locator('.chance-fit')).toBeInViewport();
  await expect(page.locator('.chance-go')).toBeInViewport();
  await page.locator('.chance-practical summary').click();
  await page.locator('.chance-practical').scrollIntoViewIfNeeded();
  const header = await page.locator('.dialog-top').boundingBox();
  const scroll = await page.locator('.chance-scroll').boundingBox();
  expect(scroll.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#home-dice-result img')).toHaveCount(0);
  await page.evaluate(() => {
    const mount = window.OmakaseDice.mount;
    window.OmakaseDice.mount = (...args) => ({
      ...mount(...args),
      animate: async () => {
        throw new Error('Synthetic presentation failure');
      },
    });
  });
  await page.locator('.home-dice-actions [data-action=home-roll]').click();
  await page.locator('#dice-form [type=submit]').click();
  await expect(page.locator('#dice-result h3')).toHaveText(title);
  await expect(page.locator('#dice-form [type=submit]')).toBeEnabled();
});
