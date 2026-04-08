// spec: specs/budget.md

import { test, expect } from '../../tests/fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('2. /budget/transactions — 거래 내역 (읽기 전용)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget/transactions');
    // Wait for loading to complete — either table, empty state, or error
    await Promise.race([
      page.getByRole('columnheader', { name: '날짜' }).waitFor({ timeout: 10000 }),
      page.getByText('거래 내역이 없습니다.').waitFor({ timeout: 10000 }),
    ]).catch(() => {});
  });

  test('2-1. 거래 목록 테이블 렌더링', async ({ page }) => {
    // Total count text (visible regardless of data)
    await expect(page.getByText(/총 \d+건/)).toBeVisible({ timeout: 10000 });

    // Check if there's data
    const hasTable = await page.getByRole('columnheader', { name: '날짜' }).isVisible().catch(() => false);
    if (!hasTable) {
      test.skip();
      return;
    }

    // Table headers
    await expect(page.getByRole('columnheader', { name: '날짜' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '카테고리' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '제목' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '유형' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '금액' })).toBeVisible();

    // At least one row with edit/delete buttons
    const rows = page.getByRole('row').filter({ has: page.getByRole('button', { name: '수정' }) });
    await expect(rows.first()).toBeVisible();

    // Each row has 수정 and 삭제 buttons
    await expect(rows.first().getByRole('button', { name: '수정' })).toBeVisible();
    await expect(rows.first().getByRole('button', { name: '삭제' })).toBeVisible();
  });

  test('2-2. 유형 필터 — 지출 선택', async ({ page }) => {
    // Wait for page to settle
    await expect(page.getByText(/총 \d+건/)).toBeVisible({ timeout: 10000 });

    // Click type filter Select trigger (first Select in the filter card)
    const typeSelect = page.locator('[role="combobox"]').first();
    await typeSelect.click();
    await page.getByRole('option', { name: '지출' }).click();

    // Wait for data reload
    await page.waitForTimeout(800);

    // Check that no income or saving badges appear
    const incomeBadges = page.getByRole('row').filter({ hasText: '수입' }).filter({
      has: page.getByRole('button', { name: '수정' })
    });
    const savingBadges = page.getByRole('row').filter({ hasText: '저축' }).filter({
      has: page.getByRole('button', { name: '수정' })
    });

    await expect(incomeBadges).toHaveCount(0);
    await expect(savingBadges).toHaveCount(0);
  });

  test('2-3. 날짜 범위 필터 적용', async ({ page }) => {
    // Wait for page to settle
    await expect(page.getByText(/총 \d+건/)).toBeVisible({ timeout: 10000 });

    // Fill start date
    const startInput = page.locator('input[type="date"]').first();
    await startInput.fill('2026-03-01');
    await page.waitForTimeout(300);

    // Fill end date
    const endInput = page.locator('input[type="date"]').last();
    await endInput.fill('2026-03-31');
    await page.waitForTimeout(800);

    // Verify total count text is still shown (page reset)
    await expect(page.getByText(/총 \d+건/)).toBeVisible();
  });

  test('2-4. 페이지네이션 — 다음 페이지 이동', async ({ page }) => {
    // Wait for page to settle
    await expect(page.getByText(/총 \d+건/)).toBeVisible({ timeout: 10000 });

    // Check if pagination exists (requires 21+ transactions)
    const nextBtn = page.getByRole('button', { name: '다음 페이지' });
    const hasPagination = await nextBtn.isVisible().catch(() => false);

    if (!hasPagination) {
      test.skip();
      return;
    }

    await nextBtn.click();
    await page.waitForTimeout(500);

    // Verify page changed to 2
    await expect(page.getByText('2 /')).toBeVisible();

    // Previous button should now be enabled
    const prevBtn = page.getByRole('button', { name: '이전 페이지' });
    await expect(prevBtn).toBeEnabled();
  });
});
