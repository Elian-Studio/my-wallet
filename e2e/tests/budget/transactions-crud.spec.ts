// spec: specs/budget.md

import { test, expect } from '../../tests/fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('2. /budget/transactions — 거래 CRUD 체인', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget/transactions');
    // Wait for page to load — either table header (with data) or loading complete indicator
    await Promise.race([
      page.getByRole('columnheader', { name: '날짜' }).waitFor({ timeout: 10000 }),
      page.getByText('거래 내역이 없습니다.').waitFor({ timeout: 10000 }),
      page.getByText(/총 \d+건/).waitFor({ timeout: 10000 }),
    ]).catch(() => {});
  });

  test('2-5. 거래 추가 — 정상 흐름', async ({ page }) => {
    // Clean up any existing "E2E 테스트 지출" entries from previous runs
    let existing = page.getByRole('row').filter({ hasText: 'E2E 테스트 지출' }).first();
    while (await existing.isVisible().catch(() => false)) {
      page.once('dialog', async (d) => { await d.accept(); });
      await existing.getByRole('button', { name: '삭제' }).click();
      await page.waitForTimeout(800);
      existing = page.getByRole('row').filter({ hasText: 'E2E 테스트 지출' }).first();
    }

    // Also clean up "E2E 테스트 지출 수정됨" from previous runs
    let existingModified = page.getByRole('row').filter({ hasText: 'E2E 테스트 지출 수정됨' }).first();
    while (await existingModified.isVisible().catch(() => false)) {
      page.once('dialog', async (d) => { await d.accept(); });
      await existingModified.getByRole('button', { name: '삭제' }).click();
      await page.waitForTimeout(800);
      existingModified = page.getByRole('row').filter({ hasText: 'E2E 테스트 지출 수정됨' }).first();
    }

    // Click 추가 button
    await page.getByRole('button', { name: '추가' }).click();

    // Verify dialog opens with title
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '거래 추가' })).toBeVisible();

    // Select type "지출"
    const typeSelect = dialog.locator('[role="combobox"]').first();
    await typeSelect.click();
    await page.getByRole('option', { name: '지출' }).click();

    // Select first EXPENSE category
    const categorySelect = dialog.locator('[role="combobox"]').nth(1);
    await categorySelect.click();
    const firstOption = page.getByRole('option').first();
    await firstOption.click();

    // Fill title
    await dialog.getByPlaceholder('거래 제목').fill('E2E 테스트 지출');

    // Fill amount
    await dialog.getByPlaceholder('0').fill('50000');

    // Fill date
    await dialog.locator('input[type="date"]').fill('2026-03-15');

    // Submit
    await dialog.getByRole('button', { name: '추가' }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 8000 });

    // Verify row appears in table
    await expect(page.getByRole('cell', { name: 'E2E 테스트 지출' })).toBeVisible({ timeout: 8000 });

    // Verify amount shows -50,000
    await expect(page.getByText('-50,000원')).toBeVisible();
  });

  test('2-6. 거래 추가 — 카테고리 미선택 시 검증 오류', async ({ page }) => {
    // Open add dialog
    await page.getByRole('button', { name: '추가' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill only title and amount, no category
    await dialog.getByPlaceholder('거래 제목').fill('오류 테스트');
    await dialog.getByPlaceholder('0').fill('10000');

    // Try to submit
    await dialog.getByRole('button', { name: '추가' }).click();

    // Error message should appear
    await expect(dialog.getByText('카테고리를 선택해주세요.')).toBeVisible();

    // Dialog should still be open
    await expect(dialog).toBeVisible();

    // Close dialog
    await dialog.getByRole('button', { name: '취소' }).click();
  });

  test('2-7. 거래 수정', async ({ page }) => {
    // Find the E2E test row
    const targetRow = page.getByRole('row').filter({ hasText: 'E2E 테스트 지출' })
      .filter({ not: page.getByText('수정됨') }).first();
    await expect(targetRow).toBeVisible({ timeout: 8000 });

    // Click edit button on that row
    await targetRow.getByRole('button', { name: '수정' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '거래 수정' })).toBeVisible();

    // Change title
    const titleInput = dialog.getByPlaceholder('거래 제목');
    await titleInput.clear();
    await titleInput.fill('E2E 테스트 지출 수정됨');

    // Change amount
    const amountInput = dialog.getByPlaceholder('0');
    await amountInput.clear();
    await amountInput.fill('75000');

    // Submit
    await dialog.getByRole('button', { name: '수정' }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify updated row
    await expect(page.getByRole('cell', { name: 'E2E 테스트 지출 수정됨' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('-75,000원')).toBeVisible();
  });

  test('2-8. 거래 삭제', async ({ page }) => {
    // Get total count before deletion
    const totalText = await page.getByText(/총 \d+건/).textContent();
    const beforeCount = parseInt(totalText?.match(/총 (\d+)건/)?.[1] ?? '0');

    // Find the modified row
    const targetRow = page.getByRole('row').filter({ hasText: 'E2E 테스트 지출 수정됨' }).first();
    await expect(targetRow).toBeVisible({ timeout: 8000 });

    // Handle browser confirm dialog
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('거래를 삭제하시겠습니까?');
      await dialog.accept();
    });

    // Click delete button
    await targetRow.getByRole('button', { name: '삭제' }).click();

    // Row should disappear
    await expect(page.getByRole('cell', { name: 'E2E 테스트 지출 수정됨' })).not.toBeVisible({ timeout: 8000 });

    // Total count should decrease by 1
    if (beforeCount > 0) {
      await expect(page.getByText(`총 ${beforeCount - 1}건`)).toBeVisible({ timeout: 8000 });
    }
  });
});
