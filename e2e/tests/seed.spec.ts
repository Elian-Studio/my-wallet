// seed: 환경 초기화 + Generator 코드 스타일 참조
import { test, expect } from './fixtures';

test('seed - 로그인 후 대시보드 접속 확인', async ({ page }) => {
  // authenticatedPage fixture가 자동으로 로그인 수행
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
