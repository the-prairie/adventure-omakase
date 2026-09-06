import { test, expect, TEST_KEY } from './runtime.mjs';

test('shared names remain text after reload and profile rendering', async ({
  page,
  runtime,
}) => {
  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  const name = '<img src=x onerror=alert(1)>';
  await page.goto(runtime.url + '/#setup=' + TEST_KEY);
  await page.locator('#f-name').fill(name);
  await page.locator('#auth-form [type=submit]').click();
  await expect(page.locator('.meta-line')).toContainText(name);
  await page.reload();
  await expect(page.locator('.meta-line')).toContainText(name);
  await page.locator('[data-action=profile]:visible').first().click();
  await expect(page.locator('#f-name')).toHaveValue(name);
  await expect(page.locator('img[onerror]')).toHaveCount(0);
  expect(dialogs).toEqual([]);
});
