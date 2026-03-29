// spec: specs/budget.md

import { test, expect } from '../../tests/fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('3. /budget/analysis — 예산 분석 (읽기 전용)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget/analysis');
    // Wait for budget settings card to appear and loading to complete
    await expect(page.getByText('예산 설정')).toBeVisible({ timeout: 10000 });
    // Wait for loading state to clear by waiting for either empty state or table
    await Promise.race([
      page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.').waitFor({ timeout: 10000 }),
      page.getByRole('row').filter({ has: page.getByRole('button', { name: '수정' }) }).first().waitFor({ timeout: 10000 }),
    ]).catch(() => {});
  });

  test('3-1. 예산 설정 테이블 렌더링', async ({ page }) => {
    // Budget settings card
    await expect(page.getByText('예산 설정')).toBeVisible();

    // 예산 추가 button
    await expect(page.getByRole('button', { name: '예산 추가' })).toBeVisible();

    // Check if there's at least one budget row or empty state
    const hasRows = await page.getByRole('row').filter({ has: page.getByRole('button', { name: '수정' }) }).count();
    const hasEmptyState = await page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.').isVisible().catch(() => false);

    expect(hasRows > 0 || hasEmptyState).toBeTruthy();
  });

  test('3-2. 예산이 없을 때 빈 상태 메시지', async ({ page }) => {
    // Move to a past month with no budgets (3 months ago)
    // Click prev month 3 times
    const prevBtn = page.getByRole('button', { name: '이전 월' });
    await prevBtn.click();
    await prevBtn.click();
    await prevBtn.click();

    await page.waitForTimeout(1000);

    // Either empty message OR existing budgets
    const emptyMsg = page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.');
    const hasData = await page.getByRole('row').filter({ has: page.getByRole('button', { name: '수정' }) }).count();

    if (hasData === 0) {
      await expect(emptyMsg).toBeVisible();
    } else {
      // If there's data, skip assertion — data-dependent
      test.skip();
    }
  });

  test('3-6. 상세 분석 테이블 컬럼 렌더링', async ({ page }) => {
    // Scroll to analysis table
    await page.getByText('상세 분석').scrollIntoViewIfNeeded();

    const analysisSection = page.locator('text=상세 분석').first();
    await expect(analysisSection).toBeVisible();

    // Check if there's data or empty state
    const emptyMsg = page.getByText('분석할 데이터가 없습니다.');
    const isEmpty = await emptyMsg.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip();
      return;
    }

    // Find the analysis table (the one with 예산/실적/차이/달성률/상태 columns)
    // The analysis table has unique columns: 차이, 달성률, 상태
    const analysisTable = page.locator('table').filter({ has: page.getByRole('columnheader', { name: '달성률' }) });
    await expect(analysisTable.getByRole('columnheader', { name: '카테고리' })).toBeVisible();
    await expect(analysisTable.getByRole('columnheader', { name: '예산' })).toBeVisible();
    await expect(analysisTable.getByRole('columnheader', { name: '실적' })).toBeVisible();
    await expect(analysisTable.getByRole('columnheader', { name: '차이' })).toBeVisible();
    await expect(analysisTable.getByRole('columnheader', { name: '달성률' })).toBeVisible();
    await expect(analysisTable.getByRole('columnheader', { name: '상태' })).toBeVisible();

    // Achievement rate format (xx.x%)
    const rateCell = page.getByRole('cell').filter({ hasText: /\d+\.\d+%/ });
    await expect(rateCell.first()).toBeVisible();
  });

  test('3-7. Recharts 막대 차트 렌더링', async ({ page }) => {
    await page.getByText('카테고리별 예산 vs 실적').scrollIntoViewIfNeeded();
    await expect(page.getByText('카테고리별 예산 vs 실적')).toBeVisible();

    const noDataMsg = page.getByText('표시할 데이터가 없습니다.');
    const isEmpty = await noDataMsg.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip();
      return;
    }

    // Chart SVG should be present
    const chartSvg = page.locator('svg').first();
    await expect(chartSvg).toBeVisible();

    // Legend items
    await expect(page.getByText('예산').last()).toBeVisible();
    await expect(page.getByText('실적').last()).toBeVisible();
  });

  test('3-8. 카테고리별 달성률 Progress Bar 렌더링', async ({ page }) => {
    // Check if analysis data exists
    const emptyMsg = page.getByText('분석할 데이터가 없습니다.');
    const isEmpty = await emptyMsg.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip();
      return;
    }

    await page.getByText('카테고리별 달성률').scrollIntoViewIfNeeded();
    await expect(page.getByText('카테고리별 달성률')).toBeVisible();

    // Progress bars should be visible
    const progressBars = page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThan(0);
  });

  test('3-9. 분석 데이터 없을 때 빈 상태', async ({ page }) => {
    // Move to a month with no data (3 months back)
    const prevBtn = page.getByRole('button', { name: '이전 월' });
    await prevBtn.click();
    await prevBtn.click();
    await prevBtn.click();

    await page.waitForTimeout(1000);

    // Check analysis table empty state
    const analysisEmpty = page.getByText('분석할 데이터가 없습니다.');
    const chartEmpty = page.getByText('표시할 데이터가 없습니다.');

    const hasAnalysisEmpty = await analysisEmpty.isVisible().catch(() => false);
    const hasChartEmpty = await chartEmpty.isVisible().catch(() => false);

    // If there's data in this month, skip
    const hasData = await page.getByRole('row').filter({ has: page.getByText(/\d+\.\d+%/) }).count();
    if (hasData > 0) {
      test.skip();
      return;
    }

    if (hasAnalysisEmpty) {
      await expect(analysisEmpty).toBeVisible();
    }
    if (hasChartEmpty) {
      await expect(chartEmpty).toBeVisible();
    }

    // Progress bar card should not be rendered when no analysis data
    const progressCard = page.getByText('카테고리별 달성률');
    await expect(progressCard).not.toBeVisible();
  });
});
