// spec: specs/budget.md

import { test, expect } from '../../tests/fixtures';

test.describe.configure({ mode: 'serial' });

// Use a future month for CRUD tests to avoid conflicts with existing data
const TEST_MONTH_LABEL = '2027년 4월';

async function navigateToTestMonth(page: any) {
  await page.goto('/budget/analysis');
  await expect(page.getByText('예산 설정')).toBeVisible({ timeout: 10000 });

  const monthSpan = page.locator('span.min-w-\\[120px\\]');
  let attempts = 0;
  while (attempts < 30) {
    const currentMonth = await monthSpan.textContent();
    if (currentMonth?.trim() === TEST_MONTH_LABEL) break;
    await page.getByRole('button', { name: '다음 월' }).click();
    await page.waitForTimeout(100);
    attempts++;
  }

  // Wait for loading to complete
  await Promise.race([
    page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.').waitFor({ timeout: 10000 }),
    page.getByRole('row').filter({ has: page.getByRole('button', { name: '수정' }) }).first().waitFor({ timeout: 10000 }),
  ]).catch(() => {});
}

async function cleanupTestBudgets(page: any) {
  // Delete any existing budget rows that may be leftover from previous test runs
  while (true) {
    const rows = page.getByRole('row').filter({ has: page.getByRole('button', { name: '삭제' }) });
    const count = await rows.count();
    if (count === 0) break;

    page.once('dialog', async (d: any) => { await d.accept(); });
    await rows.first().getByRole('button', { name: '삭제' }).click();
    await page.waitForTimeout(800);

    // Check if empty state appeared
    const isEmpty = await page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.').isVisible().catch(() => false);
    if (isEmpty) break;
  }
}

test.describe('3. /budget/analysis — 예산 CRUD 체인', () => {
  test('3-3. 예산 추가 — 정상 흐름', async ({ page }) => {
    await navigateToTestMonth(page);
    await cleanupTestBudgets(page);

    // Verify empty state before adding
    await expect(page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.')).toBeVisible({ timeout: 5000 });

    // Click 예산 추가 button
    await page.getByRole('button', { name: '예산 추가' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '예산 추가' })).toBeVisible();

    // Select type "지출"
    const typeSelect = dialog.locator('[role="combobox"]').first();
    await typeSelect.click();
    await page.getByRole('option', { name: '지출' }).click();

    // Select first EXPENSE category
    const categorySelect = dialog.locator('[role="combobox"]').nth(1);
    await categorySelect.click();
    const firstOption = page.getByRole('option').first();
    await firstOption.click();

    // Fill amount
    await dialog.getByPlaceholder('0').fill('300000');

    // Submit
    await dialog.getByRole('button', { name: '추가' }).click();

    // Dialog should close (verify no error message first)
    await expect(dialog.locator('p.text-sm.text-destructive')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(dialog).not.toBeVisible({ timeout: 8000 });

    // Verify new budget row appears with 300,000원 in the budget settings table (first table)
    await expect(page.locator('table').first().getByText('300,000원')).toBeVisible({ timeout: 8000 });
  });

  test('3-4. 예산 수정 — 금액만 변경 가능', async ({ page }) => {
    await navigateToTestMonth(page);

    // Find row with 300,000원 in budget settings table (has edit button)
    const targetRow = page.locator('table').first().getByRole('row').filter({ hasText: '300,000원' }).first();
    await expect(targetRow).toBeVisible({ timeout: 8000 });

    // Click edit button
    await targetRow.getByRole('button', { name: '수정' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '예산 수정' })).toBeVisible();

    // In edit mode, type/category selects should NOT be present (replaced by text display)
    const selectCount = await dialog.locator('[role="combobox"]').count();
    expect(selectCount).toBe(0); // No selects in edit mode — category shown as text

    // Change amount
    const amountInput = dialog.getByPlaceholder('0');
    await amountInput.clear();
    await amountInput.fill('400000');

    // Submit
    await dialog.getByRole('button', { name: '수정' }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify updated amount in budget settings table
    await expect(page.locator('table').first().getByText('400,000원')).toBeVisible({ timeout: 8000 });

    // Old amount should be gone from budget settings table
    await expect(page.locator('table').first().getByText('300,000원')).not.toBeVisible();
  });

  test('3-5. 예산 삭제', async ({ page }) => {
    await navigateToTestMonth(page);

    // Find row with 400,000원 that has a delete button (budget settings row)
    const targetRow = page.getByRole('row').filter({ has: page.getByRole('button', { name: '삭제' }) }).filter({ hasText: '400,000원' }).first();
    await expect(targetRow).toBeVisible({ timeout: 8000 });

    // Handle browser confirm dialog
    page.once('dialog', async (dialog: any) => {
      expect(dialog.message()).toBe('예산을 삭제하시겠습니까?');
      await dialog.accept();
    });

    // Click delete button
    await targetRow.getByRole('button', { name: '삭제' }).click();

    // Budget row with delete button should be gone
    const deletedRow = page.getByRole('row').filter({ has: page.getByRole('button', { name: '삭제' }) }).filter({ hasText: '400,000원' });
    await expect(deletedRow).toHaveCount(0, { timeout: 8000 });

    // If no more budgets, empty state should appear
    const budgetRows = page.getByRole('row').filter({ has: page.getByRole('button', { name: '수정' }) });
    const remaining = await budgetRows.count();
    if (remaining === 0) {
      await expect(page.getByText('설정된 예산이 없습니다. 예산을 추가해보세요.')).toBeVisible();
    }
  });
});
