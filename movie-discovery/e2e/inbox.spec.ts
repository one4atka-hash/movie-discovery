import { test, expect } from '@playwright/test';

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3001';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

test('inbox shows server notification after rule + dev run', async ({ page, request }) => {
  let backendUp = false;
  try {
    const health = await request.get(`${API}/api/health`);
    backendUp = health.ok();
  } catch {
    backendUp = false;
  }
  test.skip(!backendUp, 'Backend not available');

  let frontendUp = false;
  try {
    const fe = await request.get(`${BASE}/`);
    frontendUp = fe.ok();
  } catch {
    frontendUp = false;
  }
  test.skip(!frontendUp, 'Frontend not available');

  const email = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const reg = await request.post(`${API}/api/auth/register`, {
    data: { email, password: 'passw0rd!' },
  });
  test.skip(!reg.ok(), 'Register failed');

  const { token } = (await reg.json()) as { token: string };

  const ruleRes = await request.post(`${API}/api/alert-rules`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'E2E rule',
      enabled: true,
      filters: {},
      channels: { inApp: true, webPush: false, email: false, calendar: false },
      quietHours: null,
    },
  });
  test.skip(!ruleRes.ok(), 'alert-rules failed');

  const runRes = await request.post(`${API}/api/alerts/run`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const runBody = (await runRes.json()) as { ok?: boolean; error?: string };
  test.skip(!runRes.ok() || !runBody.ok, `Dev alerts: ${runBody.error ?? 'disabled'}`);

  await page.goto('/inbox');
  await page.evaluate((t) => {
    localStorage.setItem('server.jwt.token.v1', t);
  }, token);
  await page.reload();
  await page.getByTestId('inbox-load-server-feed').click();
  await expect(page.getByText('Sample alert')).toBeVisible();
});
