// spec: specs/dashboard.md
// Group B — 손실/초과 케이스: TC-04, TC-06
// Group C — 빈 상태: TC-09
//
// NOTE: authenticatedPage fixture is auto:true and navigates to /dashboard first.
// We set up routes THEN re-navigate to /dashboard so mocks take effect.

import { test, expect } from '../../tests/fixtures';

const API_BASE = 'http://localhost:3001/api/v1';

// TC-04. 미실현 손익 색상 — 손실 시
test.describe('대시보드 손실/초과 케이스', () => {
  test('TC-04: 미실현 손익이 손실일 때 red 색상으로 표시된다 (route mock)', async ({ page }) => {
    // 포트폴리오 API를 손실 데이터로 모킹 (authenticatedPage fixture 이후 재네비게이션)
    await page.route(`${API_BASE}/portfolio/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalInvested: 5000000,
          totalEvaluation: 4500000,
          totalUnrealizedGain: -500000,
          totalUnrealizedGainRate: -10.0,
        }),
      });
    });

    // fixture가 이미 /dashboard로 이동했으므로 다시 이동하여 mock 적용
    await page.goto('/dashboard');

    // 로딩 완료 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    await expect(page.getByText('미실현 손익')).toBeVisible({ timeout: 10000 });

    // red 색상 클래스가 적용된 요소 확인
    const lossElem = page.locator('[class*="red-6"], [class*="red-4"]').first();
    await expect(lossElem).toBeVisible({ timeout: 10000 });
  });

  // TC-06. 예산 초과 항목 — 경고 표시
  test('TC-06: 예산 초과 항목에 경고 텍스트와 destructive 색상이 표시된다 (route mock)', async ({ page }) => {
    // 예산 분석 API를 초과 데이터로 모킹 (URL 패턴: /budgets/analysis?year=...&month=...)
    await page.route(`${API_BASE}/budgets/analysis*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            categoryId: 'cat-1',
            categoryName: '식비',
            type: 'EXPENSE',
            budget: 500000,
            actual: 650000,
            difference: -150000,
            achievementRate: 130,
            status: 'OVER',
          },
          {
            categoryId: 'cat-2',
            categoryName: '교통비',
            type: 'EXPENSE',
            budget: 200000,
            actual: 150000,
            difference: 50000,
            achievementRate: 75,
            status: 'GOOD',
          },
        ]),
      });
    });

    await page.goto('/dashboard');

    // 로딩 완료 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    await expect(page.getByText('예산 달성률')).toBeVisible({ timeout: 10000 });

    // 예산 초과 텍스트 확인
    await expect(page.getByText(/예산 초과/)).toBeVisible({ timeout: 10000 });

    // destructive 색상 클래스 확인 (progress bar 또는 텍스트)
    const destructiveElem = page.locator('[class*="destructive"]').first();
    await expect(destructiveElem).toBeVisible({ timeout: 10000 });
  });

  // TC-09. 빈 상태 — 데이터 없음
  test('TC-09: 모든 API가 빈 데이터를 반환할 때 각 섹션에 빈 상태 메시지가 표시된다 (route mock)', async ({ page }) => {
    // 월별 요약 API
    await page.route(`${API_BASE}/transactions/summary/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalIncome: 0,
          totalExpense: 0,
          totalSaving: 0,
        }),
      });
    });

    // 예산 분석 API
    await page.route(`${API_BASE}/budgets/analysis*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // 보유 종목 API
    await page.route(`${API_BASE}/portfolio/holdings**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // 포트폴리오 요약 API
    await page.route(`${API_BASE}/portfolio/summary**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalInvested: 0,
          totalEvaluation: 0,
          totalUnrealizedGain: 0,
          totalUnrealizedGainRate: 0,
        }),
      });
    });

    // 거래 내역 API (최근 활동용)
    await page.route(`${API_BASE}/transactions**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
      });
    });

    // 매매 내역 API (최근 활동용)
    await page.route(`${API_BASE}/trades**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
      });
    });

    await page.goto('/dashboard');

    // 로딩 완료 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    // 빈 상태 메시지 확인
    await expect(page.getByText('이번 달 예산 데이터가 없습니다.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('보유 종목이 없습니다.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('최근 활동이 없습니다.')).toBeVisible({ timeout: 10000 });
  });
});
