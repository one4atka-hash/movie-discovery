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

test('diary bottom sheet closes on Escape and restores focus to opener', async ({
  page,
  request,
}) => {
  await ensureFrontend(page, request);

  await page.goto('/account/diary');

  const opener = page
    .getByTestId('diary-open-create')
    .or(page.getByTestId('diary-open-create-empty'))
    .locator('button')
    .first();
  await opener.click();

  const sheetPanel = page.locator('.sheet__panel');
  await expect(sheetPanel).toBeVisible();
  const titleInput = page.getByTestId('diary-title-input');
  await titleInput.focus();
  await expect(titleInput).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(sheetPanel).toBeHidden();
  await expect(opener).toBeFocused();
});
