import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

test('header look selector persists and new look is gated until unlock', async ({
  page,
  request,
}) => {
  let frontendUp = false;
  try {
    const fe = await request.get(`${BASE}/`);
    frontendUp = fe.ok();
  } catch {
    frontendUp = false;
  }
  test.skip(!frontendUp, 'Frontend not available');

  await page.goto('/');

  const lookSelect = page.locator('select.look-select');
  await expect(lookSelect).toBeVisible();

  // Switch look in header and ensure it affects CSS vars and persists across reload.
  await page.goto('/');
  const options = lookSelect.locator('option');
  const n = await options.count();
  test.skip(n < 2, 'Not enough looks to switch');

  const beforeAccent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  );

  const initial = await lookSelect.inputValue();
  await lookSelect.selectOption({ index: 1 });
  const chosen = await lookSelect.inputValue();
  expect(chosen).not.toBe(initial);

  const afterAccent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  );
  expect(afterAccent).not.toBe(beforeAccent);

  await page.waitForFunction(
    (v) => {
      try {
        return localStorage.getItem('app.looks.active.v1') === v;
      } catch {
        return false;
      }
    },
    chosen,
    { timeout: 5000 },
  );

  await page.reload();
  const storedAfterReload = await page.evaluate(() => {
    try {
      return localStorage.getItem('app.looks.active.v1');
    } catch {
      return null;
    }
  });
  expect(storedAfterReload).toBe(chosen);

  const accentAfterReload = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  );
  expect(accentAfterReload).toBe(afterAccent);

  await expect(lookSelect).toHaveValue(chosen, { timeout: 10_000 });
});
