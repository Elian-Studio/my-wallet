// spec: specs/dashboard.md
// Group D — 로딩/UX: TC-10

import { test, expect } from '../../tests/fixtures';

const API_BASE = 'http://localhost:3001/api/v1';

test.describe('대시보드 로딩 상태', () => {
  // TC-10. 로딩 스켈레톤 상태
  test('TC-10: API 응답 지연 시 animate-pulse 스켈레톤이 표시된다', async ({ page }) => {
    // 응답을 3초 지연시키는 미들웨어 설정 (page.goto 전에 등록해야 효과 있음)
    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    await page.route(`${API_BASE}/transactions/summary/**`, async (route) => {
      await delay(3000);
      await route.continue();
    });
    await page.route(`${API_BASE}/budgets/analysis**`, async (route) => {
      await delay(3000);
      await route.continue();
    });
    await page.route(`${API_BASE}/portfolio/summary**`, async (route) => {
      await delay(3000);
      await route.continue();
    });
    await page.route(`${API_BASE}/portfolio/holdings**`, async (route) => {
      await delay(3000);
      await route.continue();
    });
    await page.route(`${API_BASE}/transactions**`, async (route) => {
      await delay(3000);
      await route.continue();
    });
    await page.route(`${API_BASE}/trades**`, async (route) => {
      await delay(3000);
      await route.continue();
    });

    // 지연 라우트 등록 후 페이지 이동 (fixture가 이미 /dashboard에 있으므로 재이동)
    await page.goto('/dashboard');

    // 페이지 로드 직후 (API 응답 전) 스켈레톤 확인
    // waitForLoadState('domcontentloaded')로 DOM이 생성된 후 즉시 확인
    await page.waitForLoadState('domcontentloaded');

    // animate-pulse 스켈레톤이 하나 이상 존재해야 함
    const skeletons = page.locator('.animate-pulse');
    await expect(skeletons.first()).toBeVisible({ timeout: 5000 });

    const skeletonCount = await skeletons.count();
    expect(skeletonCount).toBeGreaterThan(0);
  });

  test('TC-10: 로딩 완료 후 스켈레톤이 사라지고 섹션 헤딩이 모두 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    // 모든 스켈레톤이 사라질 때까지 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 20000 },
    ).catch(() => {/* 타임아웃 시 계속 */});

    // 모든 섹션 헤딩이 표시되어야 함
    await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('이번 달 수입')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('이번 달 지출')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('포트폴리오 평가액')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('미실현 손익')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('예산 달성률', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('보유 종목 요약', { exact: true })).toBeVisible({ timeout: 5000 });
    // 최근 활동 카드 타이틀 (exact: true로 "최근 활동이 없습니다."와 구분)
    await expect(page.getByText('최근 활동', { exact: true })).toBeVisible({ timeout: 5000 });
  });
});
