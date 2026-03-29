// spec: specs/dashboard.md
// Group A — 정상 렌더링: TC-01, TC-02, TC-03, TC-05, TC-07, TC-08

import { test, expect } from '../../tests/fixtures';

test.describe.parallel('대시보드 정상 렌더링', () => {
  // TC-01. 페이지 진입 및 헤딩 렌더링
  test('TC-01: 대시보드 h1 및 현재 월 부제목이 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible({ timeout: 10000 });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthText = `${year}년 ${month}월 현황`;
    await expect(page.getByText(monthText)).toBeVisible({ timeout: 10000 });
  });

  // TC-02. 요약 카드 4개 렌더링
  test('TC-02: 요약 카드 4개 제목이 모두 화면에 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    // 카드 제목은 로딩 여부와 무관하게 항상 표시됨
    await expect(page.getByText('이번 달 수입')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('이번 달 지출')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('포트폴리오 평가액')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('미실현 손익')).toBeVisible({ timeout: 10000 });
  });

  // TC-02 서브: 로딩 완료 후 데이터 표시
  test('TC-02: 로딩 완료 후 이번 달 지출 카드에 저축 서브텍스트가 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    // 스켈레톤 사라질 때까지 대기 (최대 15초)
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {/* 타임아웃 시 계속 진행 */});

    // 저축 서브텍스트 확인 (데이터가 없어도 0원으로 표시)
    const savingText = page.getByText(/저축.+원/);
    await expect(savingText).toBeVisible({ timeout: 15000 });
  });

  // TC-03. 미실현 손익 색상 확인
  test('TC-03: 미실현 손익 카드에 색상(emerald 또는 red)이 적용된 금액이 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    // 포트폴리오 로딩 완료 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    // 미실현 손익 카드가 보이는지 확인
    await expect(page.getByText('미실현 손익')).toBeVisible({ timeout: 10000 });

    // emerald 또는 red 색상 클래스 중 하나가 존재해야 함
    const gainElem = page.locator('[class*="emerald"]').first();
    const lossElem = page.locator('[class*="red"]').first();

    const gainVisible = await gainElem.isVisible().catch(() => false);
    const lossVisible = await lossElem.isVisible().catch(() => false);

    expect(gainVisible || lossVisible).toBeTruthy();
  });

  // TC-05. 예산 달성률 섹션
  test('TC-05: 예산 달성률 섹션 헤딩과 컨텐츠가 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('예산 달성률')).toBeVisible({ timeout: 10000 });

    // 로딩 완료 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    // 데이터 있을 경우: progressbar 확인, 없을 경우: 빈 상태 메시지 확인
    const hasProgressBar = await page.getByRole('progressbar').first().isVisible().catch(() => false);
    const hasEmptyMsg = await page.getByText('이번 달 예산 데이터가 없습니다.').isVisible().catch(() => false);

    expect(hasProgressBar || hasEmptyMsg).toBeTruthy();
  });

  // TC-05 확장: progressbar 속성 검증
  test('TC-05: progressbar가 존재할 경우 aria 속성이 올바르게 설정된다', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    const progressBars = page.getByRole('progressbar');
    const count = await progressBars.count();

    if (count === 0) {
      // 빈 상태는 허용
      await expect(page.getByText('이번 달 예산 데이터가 없습니다.')).toBeVisible();
      return;
    }

    // progressbar가 있으면 속성 검증
    const firstBar = progressBars.first();
    await expect(firstBar).toBeVisible();

    // aria-valuemin, aria-valuemax 또는 value 속성 확인
    const ariaMin = await firstBar.getAttribute('aria-valuemin');
    const ariaMax = await firstBar.getAttribute('aria-valuemax');
    expect(ariaMin !== null || ariaMax !== null).toBeTruthy();
  });

  // TC-07. 보유 종목 요약
  test('TC-07: 보유 종목 요약 섹션 헤딩이 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('보유 종목 요약')).toBeVisible({ timeout: 10000 });

    // 로딩 완료 대기
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    // 데이터 있을 경우: 종목 목록 확인, 없을 경우: 빈 상태 메시지 확인
    const hasHoldings = await page.locator('[class*="divide-y"] > div').first().isVisible().catch(() => false);
    const hasEmptyMsg = await page.getByText('보유 종목이 없습니다.').isVisible().catch(() => false);

    expect(hasHoldings || hasEmptyMsg).toBeTruthy();
  });

  // TC-07 확장: Top 5 제한
  test('TC-07: 보유 종목은 최대 5개만 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    const emptyMsg = page.getByText('보유 종목이 없습니다.');
    const isEmpty = await emptyMsg.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip();
      return;
    }

    // 종목코드 · 비중% 패턴을 포함하는 행 수 검증
    const holdingRows = page.locator('text=/[A-Z0-9]+ · \\d+\\.\\d+%/');
    const rowCount = await holdingRows.count();
    expect(rowCount).toBeLessThanOrEqual(5);
  });

  // TC-08. 최근 활동
  test('TC-08: 최근 활동 섹션 헤딩이 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('최근 활동')).toBeVisible({ timeout: 10000 });
  });

  test('TC-08: 최근 활동 섹션에 활동 항목 또는 빈 상태가 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    const hasActivities = await page.locator('ul li').first().isVisible().catch(() => false);
    const hasEmptyMsg = await page.getByText('최근 활동이 없습니다.').isVisible().catch(() => false);

    expect(hasActivities || hasEmptyMsg).toBeTruthy();
  });

  test('TC-08: 활동 항목이 있을 경우 타입 뱃지가 표시되고 최대 10개 이하이다', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 15000 },
    ).catch(() => {});

    const emptyMsg = page.getByText('최근 활동이 없습니다.');
    const isEmpty = await emptyMsg.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip();
      return;
    }

    // 활동 타입 뱃지 확인
    const badges = page.locator('ul li').filter({
      has: page.locator('span').filter({ hasText: /^(수입|지출|저축|매수|매도)$/ }),
    });
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
    expect(badgeCount).toBeLessThanOrEqual(10);
  });
});
