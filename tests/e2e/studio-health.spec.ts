import { expect, test } from '@playwright/test';

test('Studio displays the live API health contract', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Adventure Omakase' }),
  ).toBeVisible();
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  await expect(page.getByText('adventure-omakase-api')).toBeVisible();
});
