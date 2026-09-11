import { test, expect } from './runtime.mjs';

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 393, height: 852 },
]) {
  test(`Friends actions and place sheets have room at ${viewport.width}px`, async ({
    page,
    runtime,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto(runtime.url + '/example.html#demo/people');
    for (const name of ['View calendar', 'Invite a friend']) {
      const control = page.getByRole('button', { name, exact: true });
      const style = await control.evaluate((el) => {
        const css = getComputedStyle(el);
        return {
          inset: parseFloat(css.paddingInlineStart),
          height: el.getBoundingClientRect().height,
        };
      });
      expect(style.inset).toBeGreaterThanOrEqual(12);
      expect(style.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.btn.text-btn')).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath('friends-spacing.png'),
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'View calendar', exact: true })
      .click();
    await expect(
      page.locator('.trip-calendar:visible, .phone-agenda:visible'),
    ).toBeVisible();
    await page.locator('[data-nav=discover]:visible').first().click();
    if (viewport.width > 850) {
      const search = await page.locator('.places-toolbar').boundingBox();
      const regions = await page
        .locator('.places-toolbar + .places-regions')
        .boundingBox();
      expect(regions.y - search.y - search.height).toBeGreaterThanOrEqual(16);
    }
    await page.locator('#search').fill('GLION');
    await page
      .getByRole('button', { name: 'GLION red-brick warehouses', exact: true })
      .click();
    const inset = await page
      .locator('.place-sheet .dialog-body')
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(inset).toBeGreaterThanOrEqual(12);
    await expect(
      page.locator('.place-sheet .experience-photo img'),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Recommend to the group', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Stop sharing this pick', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath('place-spacing.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
