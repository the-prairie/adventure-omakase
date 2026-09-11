import { test, expect } from './runtime.mjs';

test('short phone view shows a complete place title and keeps each destination usable', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 393, height: 620 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.evaluate(() => document.fonts.ready);
  const title = page.locator('#discovery-results h3').first();
  const titleBox = await title.boundingBox();
  const dock = await page.locator('.nav-dock').boundingBox();
  // Seeing one pixel of a card is insufficient: its name must clear the dock.
  expect(titleBox.y + titleBox.height).toBeLessThan(dock.y);
  await expect(page.locator('.phone-trip-title')).toHaveText(
    'Japan, slightly off script',
  );
  const clipped = await page
    .locator('.phone-trip-title')
    .evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(clipped).toBe(false);
  await expect(page.locator('#search')).toHaveAttribute(
    'placeholder',
    'Search places',
  );
  for (const route of ['day', 'people', 'story']) {
    await page.locator(`.nav-dock [data-nav=${route}]`).click();
    const create = page.locator('.header-actions [data-action=plan-new]');
    await expect(create).toHaveAccessibleName('Open a plan');
    const box = await create.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole('heading', { name: 'Memories', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add a memory', exact: true }),
  ).toBeInViewport();
  await page.locator('.nav-dock [data-nav=discover]').click();
  for (const width of [320, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 768) {
      const cards = page.locator('#discovery-results .discovery');
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      expect(second.x).toBeGreaterThan(first.x + first.width);
      expect(Math.abs(second.y - first.y)).toBeLessThan(2);
    }
  }
});

test('saving, empty recovery, composed search and keyboard filter dismissal preserve context', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 393, height: 620 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.locator('[data-action=discovery-library][data-id=saved]').click();
  await expect(
    page.getByText('Tap the bookmark on a place', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Explore places', exact: false })
    .click();
  await expect(page.locator('#search')).toBeInViewport();
  const input = await page.locator('#search').elementHandle();
  await input.focus();
  await input.evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true, data: '' }),
    );
    el.value = 'Nezu';
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: 'Nezu',
        isComposing: true,
      }),
    );
  });
  expect(
    await input.evaluate(
      (el) => el.isConnected && el === document.activeElement,
    ),
  ).toBe(true);
  await input.evaluate((el) =>
    el.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: 'Nezu' }),
    ),
  );
  await expect(page.locator('#search')).toHaveValue('Nezu');
  await expect(page.locator('#search')).toBeFocused();
  await page.locator('#discovery-results h3 button').first().click();
  const place = await page.locator('.place-title h2').innerText();
  await page.locator('[data-action=save-detail]').click();
  await expect(page.locator('[data-action=save-detail]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(
    page
      .locator('#discovery-results h3 button')
      .filter({ hasText: place })
      .first(),
  ).toBeFocused();
  await page.locator('#search').fill('');
  const filter = page.locator('#discovery-filters');
  await filter.locator('summary').click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).click();
  await page.getByRole('option', { name: 'Tokyo', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Region', exact: true }),
  ).toBeFocused();
  await expect(filter).toHaveAttribute('open', '');
  await expect(page.locator('#result-count')).toContainText('Tokyo');
  await filter.locator('summary').focus();
  await page.keyboard.press('Escape');
  await expect(filter).not.toHaveAttribute('open', '');
  await expect(filter.locator('summary')).toBeFocused();
  await filter.locator('summary').click();
  await page.locator('#search').click();
  await expect(filter).not.toHaveAttribute('open', '');
});

test('the example hands off to the shared app without deployment instructions', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 393, height: 620 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.getByRole('button', { name: 'Go live', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Open the shared app', exact: false }),
  ).toHaveAttribute('href', '/');
  await expect(page.locator('#dialog')).not.toContainText(
    /Cloudflare|Workers|D1|R2|npm run|deployment/,
  );
  await page.getByText('Have an invitation link?', { exact: true }).click();
  await page
    .locator('#f-url')
    .fill(runtime.url + '/#join=synthetic-example-link');
  await expect(page.locator('#f-url')).toHaveValue(
    runtime.url + '/#join=synthetic-example-link',
  );
});

test('memory sharing is visible before writing and the submit action follows its audience', async ({
  page,
  runtime,
}) => {
  await page.setViewportSize({ width: 393, height: 620 });
  await page.goto(runtime.url + '/example.html#demo/story');
  await page.getByRole('button', { name: 'Add a memory', exact: true }).click();
  const audience = page.getByRole('combobox', {
    name: 'Who is this page for?',
  });
  await expect(audience).toBeInViewport();
  const audienceBox = await audience.boundingBox();
  const titleBox = await page.locator('#f-title').boundingBox();
  expect(audienceBox.y + audienceBox.height).toBeLessThan(titleBox.y);
  await expect(page.locator('#moment-form [type=submit]')).toHaveText(
    /Share with trip/,
  );
  await page.locator('#memory-visibility').selectOption('private');
  await expect(page.locator('#moment-form [type=submit]')).toHaveText(
    /Save privately/,
  );
  await page
    .locator('#memory-text')
    .fill('A synthetic private note to verify the audience.');
  await page.locator('#moment-form [type=submit]').click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page
    .getByRole('button', { name: 'My contributions', exact: true })
    .click();
  await expect(page.locator('.memory')).toContainText('Only you');
  await page.locator('[data-action=moment-edit]').first().click();
  await expect(page.locator('#memory-visibility')).toHaveValue('private');
  await expect(page.locator('#moment-form [type=submit]')).toHaveText(
    /Save privately/,
  );
});

test('narrow search fits and overview map targets remain distinct through tile failure and zoom', async ({
  page,
  runtime,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.setViewportSize({ width: 320, height: 852 });
  await page.goto(runtime.url + '/example.html#demo/discover');
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.locator('#search').evaluate((el) => {
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas').getContext('2d');
    canvas.font = style.font;
    const icon = el.parentElement
      .querySelector('.icon')
      .getBoundingClientRect();
    return (
      el.getBoundingClientRect().left >= icon.right &&
      canvas.measureText(el.placeholder).width <=
        el.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight)
    );
  });
  expect(fits).toBe(true);
  await page.setViewportSize({ width: 393, height: 620 });
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-feedback')).toBeVisible();
  const overlaps = await page
    .locator('.area-map-marker')
    .evaluateAll((markers) => {
      const boxes = markers.map((m) => m.getBoundingClientRect());
      const feedback = document
        .querySelector('.map-feedback')
        .getBoundingClientRect();
      const intersects = (a, b) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      return boxes.some(
        (a, i) =>
          intersects(a, feedback) ||
          boxes.slice(i + 1).some((b) => intersects(a, b)),
      );
    });
  expect(overlaps).toBe(false);
  const group = page.locator('.area-map-marker[title^="Tokyo + Osaka"]');
  await expect(group).toHaveCount(1);
  const overview = await group.getAttribute('title');
  await group.press('Enter');
  await expect(group).not.toHaveAttribute('title', overview);
  await group.press('Enter');
  await expect(group).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Browse places', exact: false })
    .click();
  await expect(page.locator('#discovery-results h3').first()).toBeVisible();
});
