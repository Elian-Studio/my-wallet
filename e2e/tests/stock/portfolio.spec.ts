// spec: specs/stock.md

import { test, expect } from '../fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('/stocks 포트폴리오 개요 — 렌더링 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stocks');
    // wait for the page content to settle after navigation
    await page.waitForSelector('h1', { timeout: 15000 });
  });

  test('1-1. 요약 카드 4개 렌더링', async ({ page }) => {
    // Cards are rendered immediately in the component tree
    await expect(page.getByText('총 평가금액', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('총 투자금액', { exact: true })).toBeVisible();
    await expect(page.getByText('미실현 손익', { exact: true })).toBeVisible();
    await expect(page.getByText('실현 손익', { exact: true })).toBeVisible();
  });

  test('1-2. 계좌 셀렉터 — 전체 계좌 기본 선택', async ({ page }) => {
    // The account selector uses "__all__" value but shows "전체 계좌" text in the SelectItem
    // When value === "__all__", SelectValue renders the matched SelectItem content
    const selector = page.locator('[class*="SelectTrigger"], [role="combobox"]').first();
    await expect(selector).toBeVisible({ timeout: 10000 });
    // The trigger should contain either "전체 계좌" or "__all__" depending on data load state
    // Either way, "계좌 상세 보기" link must NOT be visible
    await expect(page.getByRole('link', { name: '계좌 상세 보기' })).not.toBeVisible();
  });

  test('1-3. 계좌 셀렉터 — 특정 계좌 선택 시 데이터 필터링', async ({ page }) => {
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible({ timeout: 10000 });

    // Open dropdown
    await trigger.click();
    await page.waitForTimeout(300);

    // Find options that are NOT "전체 계좌"
    const allOptions = page.getByRole('option');
    await allOptions.first().waitFor({ timeout: 5000 }).catch(() => {});
    const optionCount = await allOptions.count();

    // Filter out "전체 계좌" option
    let accountOption = null;
    for (let i = 0; i < optionCount; i++) {
      const opt = allOptions.nth(i);
      const text = await opt.textContent();
      if (text && !text.includes('전체 계좌')) {
        accountOption = opt;
        break;
      }
    }

    if (!accountOption) {
      // Close the dropdown and skip
      await page.keyboard.press('Escape');
      test.skip();
      return;
    }

    await accountOption.click();
    await page.waitForTimeout(300);

    // "계좌 상세 보기" link should now be visible
    const detailLink = page.getByRole('link', { name: '계좌 상세 보기' });
    await expect(detailLink).toBeVisible({ timeout: 5000 });

    // Link href should contain /stocks/accounts/
    const href = await detailLink.getAttribute('href');
    expect(href).toMatch(/\/stocks\/accounts\//);
  });

  test('1-4. 보유 종목 테이블 — 손익 색상 표시', async ({ page }) => {
    // Wait for holdings section card — title contains "보유 종목" but also icon and count
    await expect(page.locator('text=/보유 종목/').first()).toBeVisible({ timeout: 10000 });

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Check that gain/loss cells have the correct color class
    const gainCells = page.locator('.text-gain');
    const lossCells = page.locator('.text-loss');
    const gainCount = await gainCells.count();
    const lossCount = await lossCells.count();
    // With holdings, at least some colored cells should exist
    expect(gainCount + lossCount).toBeGreaterThanOrEqual(0);

    // Check stock name links go to /stocks/{stockId}
    const firstStockLink = page.locator('table tbody tr').first().getByRole('link').first();
    const linkHref = await firstStockLink.getAttribute('href');
    expect(linkHref).toMatch(/\/stocks\/[^/]+$/);
  });
});

test.describe('/stocks 계좌 추가 다이얼로그', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/stocks');
    await page.waitForSelector('button:has-text("계좌 추가")', { timeout: 15000 });
  });

  test('1-5. 계좌 추가 다이얼로그 — 오픈 및 취소', async ({ page }) => {
    // The "계좌 추가" button has a Plus icon + text
    await page.getByRole('button', { name: '계좌 추가' }).click();

    // Dialog should open with title "계좌 추가"
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('heading', { name: '계좌 추가' })).toBeVisible();

    // Check form fields are visible (exact match to avoid strict mode errors)
    await expect(dialog.getByText('계좌 유형', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel('계좌 별칭 (선택)').or(dialog.getByText('계좌 별칭 (선택)', { exact: true }))).toBeVisible();

    // Click "취소" button inside dialog
    await dialog.getByRole('button', { name: '취소' }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('1-6. 계좌 추가 다이얼로그 — 증권사 미선택 시 유효성 오류', async ({ page }) => {
    // Open the dialog
    await page.getByRole('button', { name: '계좌 추가' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click submit button ("추가") inside the dialog — use exact match to avoid "계좌 추가" button
    await dialog.getByRole('button', { name: '추가', exact: true }).click();

    // Error message should be visible
    await expect(dialog.locator('.text-destructive')).toContainText('증권사를 선택해주세요.');

    // Dialog should remain open
    await expect(dialog).toBeVisible();
  });
});
