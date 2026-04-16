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
  await page.goto('/');
}

test('legacy diary redirect preserves query prefill', async ({ page, request }) => {
  await ensureFrontend(page, request);

  await page.goto('/diary?logTitle=Arrival&logTmdbId=101');

  await expect(page).toHaveURL(/\/account\/diary\?logTitle=Arrival&logTmdbId=101/);
  await expect(page.getByTestId('account-tab-diary')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('diary-title-input')).toHaveValue('Arrival');
});

test('legacy notifications redirect lands on inbox subscriptions tab', async ({
  page,
  request,
}) => {
  await ensureFrontend(page, request);

  await page.goto('/notifications');

  await expect(page).toHaveURL(/\/account\/inbox\?tab=subs/);
  await expect(page.getByTestId('account-tab-inbox')).toHaveAttribute('aria-current', 'page');
});

test('keyboard smoke exposes skip link and active nav semantics', async ({ page, request }) => {
  await ensureFrontend(page, request);

  await page.goto('/');
  await page.keyboard.press('Tab');

  const skipLink = page.getByTestId('skip-link');
  await expect(skipLink).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.getByTestId('app-main')).toBeFocused();
  await expect(page.getByTestId('nav-home')).toHaveAttribute('aria-current', 'page');
});
