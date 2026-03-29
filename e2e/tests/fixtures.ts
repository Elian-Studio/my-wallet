import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ authenticatedPage: void }>({
  authenticatedPage: [async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill(
      process.env.TEST_EMAIL ?? 'admin@my-wallet.local',
    );
    await page.getByLabel('비밀번호').fill(
      process.env.TEST_PASSWORD ?? 'admin1234',
    );
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/dashboard');
    await use();
  }, { auto: true }],
});

export { expect };
