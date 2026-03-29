// spec: specs/dashboard.md
// Group E — 네비게이션: TC-11, TC-12, TC-13

import { test, expect } from '../../tests/fixtures';

test.describe.parallel('대시보드 사이드바 네비게이션', () => {
  // TC-11. 사이드바 네비게이션 — 가계부 페이지 이동
  test('TC-11: 가계부 메뉴를 펼쳐 거래 내역 페이지로 이동한다', async ({ page }) => {
    // 1280px 이상: lg:flex sidebar가 표시됨
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    // 사이드바 aside 요소 확인
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 가계부 버튼 클릭 (서브메뉴 펼치기)
    const budgetButton = sidebar.getByRole('button', { name: /가계부/ });
    await expect(budgetButton).toBeVisible({ timeout: 10000 });
    await budgetButton.click();

    // 거래 내역 링크 표시 및 클릭
    const transactionLink = sidebar.getByRole('link', { name: '거래 내역' });
    await expect(transactionLink).toBeVisible({ timeout: 5000 });
    await transactionLink.click();

    // URL 변경 확인
    await expect(page).toHaveURL(/\/budget\/transactions/, { timeout: 10000 });
  });

  // TC-11 확장: 가계부 메뉴 active 스타일
  test('TC-11: 거래 내역 페이지에서 가계부 메뉴가 active 스타일로 강조된다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/budget/transactions');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // /budget 경로에 있으므로 가계부 버튼이 groupActive (bg-accent) 스타일이어야 함
    const budgetButton = sidebar.getByRole('button', { name: /가계부/ });
    await expect(budgetButton).toBeVisible({ timeout: 10000 });
    await expect(budgetButton).toHaveClass(/bg-accent/, { timeout: 5000 });
  });

  // TC-12. 사이드바 네비게이션 — 주식 페이지 이동
  test('TC-12: 주식 메뉴를 펼쳐 매매 내역 페이지로 이동한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 주식 버튼 클릭 (서브메뉴 펼치기)
    const stockButton = sidebar.getByRole('button', { name: /주식/ });
    await expect(stockButton).toBeVisible({ timeout: 10000 });
    await stockButton.click();

    // 매매 내역 링크 표시 및 클릭
    const tradesLink = sidebar.getByRole('link', { name: '매매 내역' });
    await expect(tradesLink).toBeVisible({ timeout: 5000 });
    await tradesLink.click();

    // URL 변경 확인
    await expect(page).toHaveURL(/\/stocks\/trades/, { timeout: 10000 });
  });

  // TC-12 확장: 주식 메뉴 active 스타일
  test('TC-12: 매매 내역 페이지에서 주식 메뉴가 active 스타일로 강조된다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/stocks/trades');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const stockButton = sidebar.getByRole('button', { name: /주식/ });
    await expect(stockButton).toBeVisible({ timeout: 10000 });
    await expect(stockButton).toHaveClass(/bg-accent/, { timeout: 5000 });
  });

  // TC-13. 로고/브랜드 링크 — 대시보드 복귀
  test('TC-13: My Wallet 로고를 클릭하면 대시보드로 이동한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // /budget/transactions에서 시작
    await page.goto('/budget/transactions');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // My Wallet 로고 링크 클릭
    const logoLink = sidebar.getByRole('link', { name: /My Wallet/ });
    await expect(logoLink).toBeVisible({ timeout: 10000 });
    await logoLink.click();

    // /dashboard로 이동 확인
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
