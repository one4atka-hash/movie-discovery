import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

test('watch status from card appears on watchlist and details', async ({ page, request }) => {
  let frontendUp = false;
  try {
    const fe = await request.get(`${BASE}/`);
    frontendUp = fe.ok();
  } catch {
    frontendUp = false;
  }
  test.skip(!frontendUp, 'Frontend not available');

  await page.goto('/');

  const card = page.locator('[data-testid="movie-card"]').first();
  try {
    await card.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    test.skip(true, 'No movie cards (TMDB empty/offline)');
    return;
  }

  const tmdbId = await card.getAttribute('data-tmdb-id');
  const title = (await card.locator('.card__title').textContent())?.trim();
  expect(tmdbId).toBeTruthy();
  expect(title).toBeTruthy();

  await card.hover();
  await page.locator('[data-testid="movie-card-watch-cycle"]').first().click();

  await page.goto('/watchlist');
  await expect(page.getByTestId('watchlist-list')).toContainText(title!);

  await page.goto(`/movie/${tmdbId}`);
  await expect(page.getByTestId('details-watch-status')).toContainText('Want');
});
