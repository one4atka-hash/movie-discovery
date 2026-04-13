import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

test('decision mode: build shortlist, pick winner, open movie', async ({ page, request }) => {
  let frontendUp = false;
  try {
    const fe = await request.get(`${BASE}/`);
    frontendUp = fe.ok();
  } catch {
    frontendUp = false;
  }
  test.skip(!frontendUp, 'Frontend not available');

  await page.goto('/decide');

  await page.getByTestId('decision-build-shortlist').locator('button').click();

  const shortlist = page.getByTestId('decision-shortlist');
  try {
    await expect(shortlist).toBeVisible({ timeout: 30_000 });
  } catch {
    test.skip(true, 'No shortlist (TMDB empty/offline)');
    return;
  }

  await page.getByTestId('decision-pick-winner').locator('button').click();

  const winnerCard = page.getByTestId('decision-winner-card');
  await expect(winnerCard).toBeVisible({ timeout: 15_000 });

  const title = (await winnerCard.locator('.winner__title').textContent())?.trim();
  expect(title).toBeTruthy();

  await page.getByTestId('decision-winner-open').locator('button').click();

  await expect(page).toHaveURL(/\/movie\/\d+/);
});
