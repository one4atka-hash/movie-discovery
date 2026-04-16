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

test('discover keeps my services onboarding visible before setup', async ({ page, request }) => {
  await ensureFrontend(page, request);

  await page.goto('/');

  const filter = page.getByTestId('home-my-services-filter');
  const chip = filter.locator('button');

  await expect(filter).toBeVisible();
  await expect(chip).toBeDisabled();
  await expect(filter).toContainText('Настроить мои сервисы');
});

test('discover syncs search query with URL and clears it back to dashboard', async ({
  page,
  request,
}) => {
  await ensureFrontend(page, request);

  await page.goto('/');

  const search = page.getByTestId('home-search-input');
  await search.fill('Arrival');

  await expect(page).toHaveURL(/\/\?q=Arrival$/);

  await search.fill('');

  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('home-my-services-filter')).toBeVisible();
});
