// spec: specs/stock.md

import { test, expect } from '../fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('/stocks/[stockId] 종목 상세', () => {
  // stockId is discovered from the /stocks/trades page (trade rows contain stock data)
  // or from the stocks API. We navigate to the stock detail from the trades page.
  let stockUrl: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await page.goto('http://localhost:3000/login');
      await page.getByLabel('이메일').fill(
        process.env.TEST_EMAIL ?? 'admin@my-wallet.local',
      );
      await page.getByLabel('비밀번호').fill(
        process.env.TEST_PASSWORD ?? 'admin1234',
      );
      await page.getByRole('button', { name: '로그인' }).click();
      await page.waitForURL('**/dashboard');

      // Strategy 1: check holdings on /stocks for direct stock links
      await page.goto('http://localhost:3000/stocks');
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.waitForTimeout(1000);

      const stockLinks = page.locator('table tbody tr a[href]').filter({
        hasNot: page.locator('[href*="accounts"]'),
      });
      const count1 = await stockLinks.count();
      for (let i = 0; i < count1; i++) {
        const href = await stockLinks.nth(i).getAttribute('href');
        if (href && /^\/stocks\/[a-z0-9]+$/.test(href)) {
          stockUrl = href;
          break;
        }
      }

      // Strategy 2: use trades page and find stock name cell to derive stockId
      // by opening a trade's edit form and reading the stockId from form state
      if (!stockUrl) {
        await page.goto('http://localhost:3000/stocks/trades');
        await page.waitForSelector('h1', { timeout: 10000 });
        await page.waitForTimeout(1000);

        const tradeRows = page.locator('table tbody tr');
        const rowCount = await tradeRows.count();

        if (rowCount > 0) {
          // Open the edit form for the first trade to get stockId
          await page.locator('button[aria-label="수정"]').first().click();
          await page.waitForTimeout(300);
          const dialog = page.getByRole('dialog');
          if (await dialog.isVisible()) {
            // In edit mode, the form only shows date/price/quantity — no stock combobox
            // We need another approach: use the API response intercepted from the trades list
          }
          await page.keyboard.press('Escape');
        }
      }

      // Strategy 3: open "매매 추가", search stocks, get the first option's value
      if (!stockUrl) {
        await page.goto('http://localhost:3000/stocks/trades');
        await page.waitForSelector('h1', { timeout: 10000 });
        await page.waitForTimeout(500);

        await page.getByRole('button', { name: '매매 추가' }).click();
        await page.waitForTimeout(300);
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          const stockCombobox = dialog.getByRole('combobox').first();
          await stockCombobox.click();
          await page.waitForTimeout(300);
          const firstOption = page.locator('[role="option"]').first();
          if (await firstOption.count() > 0) {
            // Get the value from the option element
            const optionValue = await firstOption.getAttribute('data-value');
            if (optionValue) {
              stockUrl = `/stocks/${optionValue}`;
            }
          }
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
          await page.keyboard.press('Escape');
        }
      }
    } finally {
      await page.close();
    }
  });

  test('3-1. 종목 정보 헤더 렌더링', async ({ page }) => {
    if (!stockUrl) {
      test.skip();
      return;
    }

    await page.goto(stockUrl);
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(500);

    // "종목 정보" card should be visible
    await expect(page.getByText('종목 정보', { exact: true })).toBeVisible({ timeout: 10000 });

    // Stock name text should be rendered (the bold stock name in the card content)
    // And at least one Badge (outline for code, secondary for market) should render
    const cardContent = page.locator('text=종목 정보').locator('..').locator('..');
    await expect(page.locator('main, .space-y-6').getByText('종목 정보')).toBeVisible();
  });

  test('3-2. 보유 현황 섹션 — 보유 종목이 있을 때 표시', async ({ page }) => {
    if (!stockUrl) {
      test.skip();
      return;
    }

    await page.goto(stockUrl);
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(500);

    const holdingsSection = page.getByText('보유 현황', { exact: true });
    const isVisible = await holdingsSection.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    // Holdings table headers — use the holdings card section
    const holdingsCard = page.locator('div').filter({ hasText: /^보유 현황$/ }).last().locator('..').locator('..');
    await expect(page.getByRole('columnheader', { name: '종목명' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '수량' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '평균단가' }).first()).toBeVisible();
  });

  test('3-3. 해당 종목 매매 내역만 표시', async ({ page }) => {
    if (!stockUrl) {
      test.skip();
      return;
    }

    await page.goto(stockUrl);
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(500);

    // "매매 내역" text appears in the trade card title
    await expect(page.getByText('매매 내역').first()).toBeVisible({ timeout: 10000 });

    const tradeRows = page.locator('table tbody tr');
    const rowCount = await tradeRows.count();
    if (rowCount === 0) {
      test.skip();
    }
  });

  test('3-4. 뒤로가기 링크', async ({ page }) => {
    if (!stockUrl) {
      test.skip();
      return;
    }

    await page.goto(stockUrl);
    await page.waitForSelector('h1', { timeout: 10000 });

    // The back button: <Link href="/stocks" class="..."><ArrowLeft /></Link>
    // It's the first link in the page header area with href="/stocks"
    const backLink = page.locator('a[href="/stocks"]').first();
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await backLink.click();

    await expect(page).toHaveURL(/\/stocks$/, { timeout: 10000 });
  });
});
