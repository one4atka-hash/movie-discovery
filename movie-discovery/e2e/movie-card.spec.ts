import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

async function ensureFrontend(
  page: Parameters<typeof test>[0]['page'],
  request: Parameters<typeof test>[0]['request'],
) {
  let frontendUp = false;
  try {
    const fe = await request.get(`${BASE}/`);
    frontendUp = fe.ok();
  } catch {
    frontendUp = false;
  }
  test.skip(!frontendUp, 'Frontend not available');
}

test('movie card keeps actions local and navigates only from detail link', async ({
  page,
  request,
}) => {
  await ensureFrontend(page, request);

  await page.goto('/');

  const card = page.getByTestId('movie-card').first();
  try {
    await card.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    test.skip(true, 'No movie cards available');
    return;
  }

  const tmdbId = await card.getAttribute('data-tmdb-id');
  expect(tmdbId).toBeTruthy();

  await card.getByTestId('movie-card-watch-cycle').click();
  await expect(page).toHaveURL('/');

  await card.locator('.card__titleLink').click();
  await expect(page).toHaveURL(new RegExp(`/movie/${tmdbId}$`));
});
