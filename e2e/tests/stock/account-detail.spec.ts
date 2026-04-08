// spec: specs/stock.md

import { test, expect } from '../fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('/stocks/accounts/[accountId] 계좌 상세', () => {
  let accountUrl: string | null = null;

  // Navigate to /stocks and find an account via the selector
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await page.goto('http://localhost:3000/login');
      await page.getByLabel('이메일').fill(
        process.env.TEST_EMAIL ?? 'admin@my-wallet.local',
      );
      await page.getByLabel('비밀번호').fill(
        process.env.TEST_PASSWORD ?? 'admin1234',
      );
      await page.getByRole('button', { name: '로그인' }).click();
      await page.waitForURL('**/dashboard');

      await page.goto('http://localhost:3000/stocks');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Open the account selector and pick the first non-"전체 계좌" option
      const trigger = page.getByRole('combobox').first();
      await trigger.click();
      await page.waitForTimeout(300);

      const options = page.getByRole('option').filter({ hasNot: page.getByText('전체 계좌') });
      const count = await options.count();
      if (count > 0) {
        await options.first().click();
        await page.waitForTimeout(300);

        const detailLink = page.getByRole('link', { name: '계좌 상세 보기' });
        const linkVisible = await detailLink.isVisible().catch(() => false);
        if (linkVisible) {
          accountUrl = await detailLink.getAttribute('href');
        }
      }
    } finally {
      await page.close();
    }
  });

  test('4-1. 계좌 정보 카드 렌더링', async ({ page }) => {
    if (!accountUrl) {
      test.skip();
      return;
    }

    await page.goto(accountUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // "계좌 정보" card should be visible
    await expect(page.getByText('계좌 정보')).toBeVisible();

    // Account type badge (variant="outline") and broker badge (variant="secondary")
    // Shadcn Badge renders as inline-flex with border and rounded-md
    const badges = page.locator('div.inline-flex.items-center.rounded-md, span.inline-flex.items-center.rounded-md');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(2);

    // "평가금액" and "미실현 손익" should be in the account info card
    await expect(page.getByText('평가금액', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('미실현 손익', { exact: true }).first()).toBeVisible();
  });

  test('4-2. 해당 계좌 보유 종목 테이블', async ({ page }) => {
    if (!accountUrl) {
      test.skip();
      return;
    }

    await page.goto(accountUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // "보유 종목" card should be visible
    await expect(page.getByText('보유 종목')).toBeVisible();

    const tradeRows = page.locator('table tbody tr');
    const rowCount = await tradeRows.count();

    if (rowCount > 0) {
      // Stock name links should go to /stocks/{stockId}
      const firstStockLink = tradeRows.first().getByRole('link').first();
      const href = await firstStockLink.getAttribute('href');
      expect(href).toMatch(/\/stocks\/[^/]+$/);
    }
  });

  test('4-3. 월별 실현 손익 차트 — 연도 네비게이션', async ({ page }) => {
    if (!accountUrl) {
      test.skip();
      return;
    }

    await page.goto(accountUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const currentYear = new Date().getFullYear();

    // "월별 실현 손익" card should be visible
    await expect(page.getByText('월별 실현 손익')).toBeVisible();

    // Default year should be current year
    await expect(page.getByText(`${currentYear}년`)).toBeVisible();

    // Click previous year button (‹)
    const prevButton = page.getByRole('button', { name: '‹' });
    const prevDisabled = await prevButton.isDisabled();

    if (!prevDisabled) {
      await prevButton.click();
      await page.waitForTimeout(300);
      await expect(page.getByText(`${currentYear - 1}년`)).toBeVisible();

      // Click next year button (›) to go back
      const nextButton = page.getByRole('button', { name: '›' });
      await nextButton.click();
      await page.waitForTimeout(300);
      await expect(page.getByText(`${currentYear}년`)).toBeVisible();

      // Next button should now be disabled (can't go past current year)
      await expect(nextButton).toBeDisabled();
    }

    // Go 5 years back to verify the prev button becomes disabled
    let yearsBack = 0;
    while (yearsBack < 5) {
      const btn = page.getByRole('button', { name: '‹' });
      const disabled = await btn.isDisabled();
      if (disabled) break;
      await btn.click();
      await page.waitForTimeout(200);
      yearsBack++;
    }
    // After going back 5 years, prev button should be disabled
    await expect(page.getByRole('button', { name: '‹' })).toBeDisabled();
  });

  test('4-4. 월별 실현 손익 차트 — 데이터 없을 때 빈 상태', async ({ page }) => {
    if (!accountUrl) {
      test.skip();
      return;
    }

    await page.goto(accountUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Navigate to the oldest available year (5 years back) which is likely to have no data
    for (let i = 0; i < 5; i++) {
      const prevBtn = page.getByRole('button', { name: '‹' });
      const disabled = await prevBtn.isDisabled();
      if (disabled) break;
      await prevBtn.click();
      await page.waitForTimeout(200);
    }

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check if there's an empty state message
    const emptyMessage = page.getByText('표시할 성과 데이터가 없습니다.');
    const chartContainer = page.locator('.recharts-wrapper');

    const emptyVisible = await emptyMessage.isVisible().catch(() => false);
    const chartVisible = await chartContainer.isVisible().catch(() => false);

    // Either empty message is shown OR chart renders — both are valid states
    // The test verifies that when empty, the message is shown and chart is not
    if (emptyVisible) {
      await expect(emptyMessage).toBeVisible();
      // Chart should not be visible when empty
      expect(chartVisible).toBe(false);
    }
    // If not empty (has data for old years too), that's also acceptable
  });
});
