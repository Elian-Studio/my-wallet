// spec: specs/budget.md

import { test, expect } from '../../tests/fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('1. /budget — 가계부 개요', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget');
    // Wait for loading skeleton to disappear
    await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 10000 }).catch(() => {});
  });

  test('1-1. 월별 요약 카드 4종 렌더링', async ({ page }) => {
    await expect(page.getByText('수입').first()).toBeVisible();
    await expect(page.getByText('지출').first()).toBeVisible();
    await expect(page.getByText('저축').first()).toBeVisible();
    await expect(page.getByText('잔액').first()).toBeVisible();
  });

  test('1-2. MonthPicker로 이전 월 이동 후 요약 갱신', async ({ page }) => {
    const monthSpan = page.locator('span.min-w-\\[120px\\]');
    const currentMonth = await monthSpan.textContent();

    await page.getByRole('button', { name: '이전 월' }).click();

    const newMonth = await monthSpan.textContent();
    expect(newMonth).not.toEqual(currentMonth);

    // Verify URL didn't change
    expect(page.url()).toContain('/budget');
    expect(page.url()).not.toContain('?');
  });

  test('1-3. 거래 내역 링크 이동', async ({ page }) => {
    await page.getByRole('link', { name: '내역 보기' }).click();
    await page.waitForURL('**/budget/transactions');
    expect(page.url()).toContain('/budget/transactions');
  });

  test('1-4. 예산 분석 링크 이동', async ({ page }) => {
    await page.getByRole('link', { name: '분석 보기' }).click();
    await page.waitForURL('**/budget/analysis');
    expect(page.url()).toContain('/budget/analysis');
  });
});
