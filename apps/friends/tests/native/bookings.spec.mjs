import { test, expect, TEST_KEY } from './runtime.mjs';
test.use({ companionFixture: true });
const action = (p, name) =>
  p.locator(`[data-action="${name}"]:visible`).first();
const state = (p) =>
  p.evaluate(() => fetch('/api/state').then((r) => r.json()));
function pdf(text) {
  const stream = `BT /F1 16 Tf 40 750 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let result = '%PDF-1.4\n',
    offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(result));
    result += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(result);
  result += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return {
    name: 'synthetic-booking.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(result),
  };
}
async function create(page, runtime) {
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill('Synthetic owner');
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('[data-nav=people]:visible').first()).toBeVisible();
}

test('booking screenshot at join and later PDF update preserve partial dates and manual details', async ({
  browser,
  runtime,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const ownerContext = await browser.newContext();
  try {
    const owner = await ownerContext.newPage();
    await create(owner, runtime);
    await action(owner, 'invite').click();
    const invitation = await owner.locator('#invite-url').inputValue();
    const source = await context.newPage();
    await source.setViewportSize({ width: 900, height: 650 });
    await source.setContent(
      '<main style="font:28px sans-serif;padding:40px"><h1>Synthetic flight booking</h1><p>Riley · Los Angeles to Osaka</p><p>Depart LAX: September 30, 15:00 local</p><p>Arrive KIX: October 1, 18:45 local (+1 day)</p><p>Year deliberately absent. No return booking shown.</p><p>TEST DOCUMENT — NOT A REAL BOOKING</p></main>',
    );
    const image = {
      name: 'synthetic-flight.png',
      mimeType: 'image/png',
      buffer: await source.screenshot(),
    };
    await source.close();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(invitation);
    await page.locator('#f-name').fill('Riley');
    await page.locator('.join-booking summary').click();
    await page.locator('#join-booking-files').setInputFiles(image);
    await expect(page.locator('#auth-form [type=submit]')).toContainText(
      'Join and read',
    );
    await page.screenshot({ path: info.outputPath('join-booking-mobile.png') });
    await page.locator('#auth-form [type=submit]').click();
    await expect(page.locator('.booking-proposal')).toContainText(
      'Oct 1, 2026',
    );
    await expect(page.locator('.booking-proposal')).toContainText(
      'Departure open',
    );
    await expect(page.locator('.booking-proposal')).not.toContainText(
      '2026-09-30',
    );
    await expect(
      page.getByRole('button', { name: 'Use these details' }),
    ).toBeDisabled();
    expect((await state(page)).me.profile.windows || []).toEqual([]);
    await page.locator('[data-booking-sources] summary').click();
    await page.screenshot({
      path: info.outputPath('booking-source-mobile.png'),
    });
    await page.locator('[data-booking-sources] summary').click();
    await page.locator('[data-booking-checked]').check();
    await page.getByRole('button', { name: 'Use these details' }).click();
    await expect(page.locator('[data-w=from]')).toHaveValue('2026-10-01');
    await expect(page.locator('[data-w=to]')).toHaveValue('');
    await page.locator('#f-bio').fill('Manual pace: slow mornings.');
    await page.locator('#f-interests').fill('Architecture');
    await page.locator('#profile-form [type=submit]').click();
    await expect(page.locator('#dialog')).not.toBeVisible();
    await page.locator('[data-nav=people]:visible').first().click();
    await expect(
      page.locator('.portrait-card').filter({ hasText: 'Riley' }),
    ).toContainText('Departure open');
    // Incomplete arrival does not claim the whole remaining trip in the overlap grid.
    expect(await page.locator('.day-cell.osaka').count()).toBe(0);
    await action(page, 'profile').click();
    await action(page, 'add-window').click();
    await page.locator('[data-w=region]').nth(1).selectOption('tokyo');
    await page.locator('[data-w=area]').nth(1).fill('Ueno');
    await page.locator('[data-w=from]').nth(1).fill('2026-10-07');
    await page.locator('[data-w=to]').nth(1).fill('2026-10-09');
    await page.locator('#booking-heading').click();
    await page.evaluate((encoded) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(
          [Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))],
          'pasted-fixture.png',
          { type: 'image/png' },
        ),
      );
      document.querySelector('#profile-form').dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: transfer,
          bubbles: true,
        }),
      );
    }, image.buffer.toString('base64'));
    await expect(page.locator('[data-booking-status]')).toContainText(
      'document ready',
    );
    await page
      .locator('#booking-files')
      .setInputFiles(
        pdf(
          'SYNTHETIC-STAY Riley Namba check-in 2026-10-01 check-out 2026-10-05',
        ),
      );
    await expect(page.locator('[data-booking-read]')).toBeEnabled();
    await page.locator('[data-booking-read]').click();
    await expect(page.locator('.booking-proposal')).toContainText(
      'Oct 5, 2026',
    );
    await page.setViewportSize({ width: 1344, height: 960 });
    await page.locator('.booking-proposal').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath('booking-update-desktop.png'),
    });
    await expect(page.locator('.booking-proposal select')).toHaveValue('0');
    await page.getByRole('button', { name: 'Use these details' }).click();
    await expect(page.locator('[data-window]')).toHaveCount(2);
    await expect(page.locator('[data-w=area]').first()).toHaveValue('Namba');
    await expect(page.locator('[data-w=to]').first()).toHaveValue('2026-10-05');
    await expect(page.locator('#f-bio')).toHaveValue(
      'Manual pace: slow mornings.',
    );
    await expect(page.locator('[data-w=area]').nth(1)).toHaveValue('Ueno');
    await page.locator('#profile-form [type=submit]').click();
    await expect(page.locator('#dialog')).not.toBeVisible();
    await page.reload();
    await action(page, 'profile').click();
    await page.locator('#booking-heading').click();
    await page.locator('[data-booking-recent]').click();
    await page
      .getByRole('button', { name: /Review booking/ })
      .first()
      .click();
    await expect(page.locator('.booking-proposal')).toContainText(
      'Already in your dates',
    );
    await expect(page.locator('[data-window]')).toHaveCount(2);
    // Manual adjustments remain available after import, including leaving a bound open again.
    await page
      .getByRole('button', { name: 'Leave departure date open' })
      .first()
      .click();
    await expect(page.locator('[data-w=to]').first()).toHaveValue('');
    expect(
      await page.locator('#profile-form').evaluate((form) =>
        [...form.querySelectorAll('input,select,textarea')]
          .filter((el) => !el.validity.valid)
          .map((el) => ({
            id: el.id,
            message: el.validationMessage,
            value: el.value,
          })),
      ),
    ).toEqual([]);
    await page.locator('#profile-form [type=submit]').click();
    await expect(page.locator('#dialog')).not.toBeVisible();
    expect((await state(page)).me.profile.windows[0].to).toBe('');
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await ownerContext.close();
  }
});

test('booking read failure and closing a delayed upload leave the profile editable and unchanged', async ({
  browser,
  runtime,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    await create(page, runtime);
    await action(page, 'profile').click();
    await page.locator('#booking-files').setInputFiles({
      name: 'not-a-pdf.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a pdf'),
    });
    await expect(page.locator('[data-booking-read]')).toBeEnabled();
    await page.locator('[data-booking-read]').click();
    await expect(page.locator('[data-booking-status]')).toContainText(
      'do not match',
    );
    expect((await state(page)).me.profile.windows || []).toEqual([]);
    await page.locator('#f-bio').fill('Can still edit manually.');
    await page.locator('#booking-files').setInputFiles(pdf('SYNTHETIC-QUOTA'));
    await expect(page.locator('[data-booking-read]')).toBeEnabled();
    await page.locator('[data-booking-read]').click();
    await expect(page.locator('[data-booking-status]')).toContainText(/quota/i);
    await page.screenshot({
      path: info.outputPath('booking-quota-mobile.png'),
    });
    await page.locator('#booking-files').setInputFiles(pdf('SYNTHETIC-STAY'));
    await expect(page.locator('[data-booking-read]')).toBeEnabled();
    await context.setOffline(true);
    await page.locator('[data-booking-read]').click();
    await expect(page.locator('[data-booking-status]')).toContainText(
      'unchanged',
    );
    await expect(page.locator('#f-bio')).toHaveValue(
      'Can still edit manually.',
    );
    await context.setOffline(false);
    let release,
      received = false;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/api/travel/tasks', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      received = true;
      await held;
      await route.continue().catch(() => undefined);
    });
    try {
      await page.locator('[data-booking-read]').click();
      await expect.poll(() => received).toBe(true);
      await page.screenshot({
        path: info.outputPath('booking-reading-mobile.png'),
      });
      await page.keyboard.press('Escape');
      release();
      await expect(page.locator('#dialog')).not.toBeVisible();
      await expect
        .poll(async () => (await state(page)).me.profile.windows || [])
        .toEqual([]);
      await action(page, 'profile').click();
      await expect(page.locator('.booking-proposal')).toHaveCount(0);
    } finally {
      release();
      await page.unroute('**/api/travel/tasks');
    }
    await page.locator('#f-bio').fill('Unsaved changes stay here.');
    expect(
      await page.evaluate(async () => {
        const current = await fetch('/api/state').then((r) => r.json());
        return (
          await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Omakase': '1' },
            body: JSON.stringify({
              name: current.me.name,
              bio: 'Changed elsewhere',
              interests: '',
              windows: [],
            }),
          })
        ).status;
      }),
    ).toBe(200);
    await page.locator('#profile-form [type=submit]').click();
    await expect(page.locator('#profile-form .form-error')).toContainText(
      'changed on another device',
    );
    await expect(page.locator('#f-bio')).toHaveValue(
      'Unsaved changes stay here.',
    );
    await page.screenshot({
      path: info.outputPath('booking-profile-conflict-mobile.png'),
    });
  } finally {
    await context.close();
  }
});
