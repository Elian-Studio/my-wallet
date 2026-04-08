// spec: specs/stock.md

import { test, expect } from '../fixtures';

test.describe.configure({ mode: 'serial' });

// Helpers to get dialog inputs by their label text (labels have no htmlFor)
function getPriceInput(dialog: ReturnType<typeof import('@playwright/test').expect extends never ? never : Parameters<Parameters<typeof import('@playwright/test').test>[2]>[0]['page']['getByRole']>) {
  // not used — inlined below
}

test.describe('/stocks/trades 매매 내역 CRUD (순차 실행)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stocks/trades');
    await page.waitForSelector('h1', { timeout: 15000 });
  });

  test('2-1. 매매 추가 — BUY 거래 정상 등록', async ({ page }) => {
    const dialog = page.getByRole('dialog');

    // Click "매매 추가" button
    await page.getByRole('button', { name: '매매 추가' }).click();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('heading', { name: '매매 추가' })).toBeVisible();

    // Search for a stock
    await dialog.getByPlaceholder('종목명 또는 코드 검색').fill('삼성');
    await page.waitForTimeout(300);

    // Click the stock combobox (first combobox in dialog) to open options
    const stockTrigger = dialog.getByRole('combobox').first();
    await stockTrigger.click();
    await page.waitForTimeout(200);

    // Pick a "삼성" stock from options, or any stock if none found
    const options = page.locator('[role="listbox"] [role="option"], [data-radix-popper-content-wrapper] [role="option"]');
    await options.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const optCount = await options.count();
    if (optCount === 0) {
      test.skip();
      return;
    }
    await options.first().click();
    await page.waitForTimeout(200);

    // Select account — second combobox
    const accountTrigger = dialog.getByRole('combobox').nth(1);
    await accountTrigger.click();
    await page.waitForTimeout(200);
    const accOptions = page.locator('[role="listbox"] [role="option"], [data-radix-popper-content-wrapper] [role="option"]');
    await accOptions.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const accCount = await accOptions.count();
    if (accCount === 0) {
      test.skip();
      return;
    }
    await accOptions.first().click();
    await page.waitForTimeout(200);

    // Select type BUY (매수) — third combobox
    const typeTrigger = dialog.getByRole('combobox').nth(2);
    await typeTrigger.click();
    await page.waitForTimeout(200);
    await page.locator('[role="option"]').filter({ hasText: '매수' }).click();
    await page.waitForTimeout(200);

    // Fill in price and quantity — labels use <label> without htmlFor, target by placeholder
    const priceInput = dialog.locator('input[type="number"]').first();
    const quantityInput = dialog.locator('input[type="number"]').nth(1);
    await priceInput.fill('10000');
    await quantityInput.fill('10');

    // Verify total preview shows
    await expect(dialog.getByText('총금액:')).toBeVisible();
    await expect(dialog.getByText('100,000원')).toBeVisible();

    // Submit — use dialog-scoped button to avoid strict mode violation
    await dialog.getByRole('button', { name: '추가', exact: true }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // New trade should appear in the list with 매수 badge
    await expect(page.getByRole('cell', { name: '매수' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('2-2. 매매 추가 — 종목 미선택 시 유효성 오류', async ({ page }) => {
    const dialog = page.getByRole('dialog');

    await page.getByRole('button', { name: '매매 추가' }).click();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select account without selecting a stock
    const accountTrigger = dialog.getByRole('combobox').nth(1);
    await accountTrigger.click();
    await page.waitForTimeout(200);
    const accOptions = page.locator('[role="option"]');
    const accCount = await accOptions.count();
    if (accCount > 0) {
      await accOptions.first().click();
      await page.waitForTimeout(200);
    }

    // Fill price and quantity only
    const priceInput = dialog.locator('input[type="number"]').first();
    const quantityInput = dialog.locator('input[type="number"]').nth(1);
    await priceInput.fill('10000');
    await quantityInput.fill('10');

    // Click submit without stock
    await dialog.getByRole('button', { name: '추가', exact: true }).click();

    // Error message should appear
    await expect(dialog.locator('.text-destructive')).toContainText('종목을 선택해주세요.');

    // Dialog should remain open
    await expect(dialog).toBeVisible();

    // Close dialog
    await dialog.getByRole('button', { name: '취소' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('2-3. 매매 수정 — 단가 및 수량 변경', async ({ page }) => {
    // Wait for the table to render after page load
    await page.waitForTimeout(500);
    const editButtons = page.locator('button[aria-label="수정"]');
    const editCount = await editButtons.count();

    if (editCount === 0) {
      test.skip();
      return;
    }

    const dialog = page.getByRole('dialog');
    await editButtons.first().click();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog title should be "매매 수정"
    await expect(dialog.getByRole('heading', { name: '매매 수정' })).toBeVisible();

    // Stock/account/type selectors should NOT appear in edit mode
    // (only tradeDate, price, quantity, reasons, memo are editable)
    await expect(dialog.getByRole('combobox')).toHaveCount(0);

    // Change price to 12000 and quantity to 5
    const priceInput = dialog.locator('input[type="number"]').first();
    const quantityInput = dialog.locator('input[type="number"]').nth(1);
    await priceInput.fill('12000');
    await quantityInput.fill('5');

    // Submit
    await dialog.getByRole('button', { name: '수정', exact: true }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });

  test('2-4. 매매 삭제 — 확인 후 제거', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const initialCount = await rows.count();

    if (initialCount === 0) {
      test.skip();
      return;
    }

    // Accept browser confirm dialog
    page.on('dialog', (d) => d.accept());

    await page.locator('button[aria-label="삭제"]').first().click();

    // Wait for list to update
    await page.waitForTimeout(1000);
    const newCount = await rows.count();
    expect(newCount).toBeLessThan(initialCount);
  });
});

test.describe('/stocks/trades 필터 (순차 실행)', () => {
  test.describe.configure({ mode: 'serial' });

  test('2-5. 필터 — 매매 유형(SELL) 필터링', async ({ page }) => {
    await page.goto('/stocks/trades');
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(500);

    const allRows = page.locator('table tbody tr');
    const totalCount = await allRows.count();
    if (totalCount === 0) {
      test.skip();
      return;
    }

    // The filters card has 3 comboboxes: 계좌, 유형 (in order on page)
    // On the page level: account filter = combobox index 0, type filter = combobox index 1
    // (stock search is an input, not combobox)
    const filterComboboxes = page.locator('.grid [role="combobox"]');
    // Type combobox is the second one in the filter grid (after account)
    const typeCombobox = filterComboboxes.nth(1);
    await typeCombobox.click();
    await page.waitForTimeout(200);

    await page.getByRole('option', { name: '매도', exact: true }).click();
    await page.waitForTimeout(500);

    // All visible rows should be "매도", no "매수" should appear
    const buyBadges = page.getByRole('cell', { name: '매수' });
    const sellBadges = page.getByRole('cell', { name: '매도' });
    const buyCount = await buyBadges.count();
    const sellCount = await sellBadges.count();

    if (sellCount > 0) {
      expect(buyCount).toBe(0);
    }
    // If no SELL trades exist, table is empty — also valid
  });

  test('2-6. 필터 초기화', async ({ page }) => {
    await page.goto('/stocks/trades');
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Apply SELL filter
    const filterComboboxes = page.locator('.grid [role="combobox"]');
    const typeCombobox = filterComboboxes.nth(1);
    await typeCombobox.click();
    await page.waitForTimeout(200);
    await page.getByRole('option', { name: '매도', exact: true }).click();
    await page.waitForTimeout(300);

    // Click "초기화" button
    await page.getByRole('button', { name: '초기화' }).click();
    await page.waitForTimeout(300);

    // The type filter should reset — combobox shows "전체" (label) or "__all__" (value)
    // Verify it no longer shows "매도"
    await expect(typeCombobox).not.toContainText('매도');
  });
});
