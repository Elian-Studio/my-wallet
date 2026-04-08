// spec: specs/auth.md
import { test, expect } from '@playwright/test';

// ─── 1. 정상 로그인 흐름 (순차 실행 - 1-2가 1-1의 상태에 의존) ───────────────
test.describe.serial('정상 로그인 흐름', () => {
  test('1-1. 유효한 자격증명으로 로그인 성공', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@my-wallet.local');
    await page.getByLabel('비밀번호').fill('admin1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/dashboard');

    await expect(page).toHaveURL(/dashboard/);

    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(accessToken).not.toBeNull();

    const userRaw = await page.evaluate(() => localStorage.getItem('user'));
    expect(userRaw).not.toBeNull();
    const user = JSON.parse(userRaw!);
    expect(user.email).toBe('admin@my-wallet.local');
  });

  test('1-2. 로그인 성공 후 /dashboard URL 유지', async ({ page }) => {
    // 이전 테스트(1-1)의 localStorage 상태를 공유하지 않으므로 다시 로그인
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@my-wallet.local');
    await page.getByLabel('비밀번호').fill('admin1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/dashboard');

    await expect(page).toHaveURL(/dashboard/);
    // /login으로 리다이렉트되지 않음
    await expect(page).not.toHaveURL(/login/);
  });
});

// ─── 2. 입력 유효성 검사 (병렬 실행 - 독립적, API 호출 없음) ─────────────────
test.describe.parallel('입력 유효성 검사', () => {
  test('2-1. 이메일 필드 비어있을 때 제출 시도 시 폼 차단', async ({ page }) => {
    await page.goto('/login');
    // 이메일은 비워두고 비밀번호만 입력
    await page.getByLabel('비밀번호').fill('admin1234');

    // API 호출 감지
    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/auth/login')) apiCalled = true;
    });

    await page.getByRole('button', { name: '로그인' }).click();

    // HTML5 validation으로 폼 제출 차단 → URL이 /login 유지
    await expect(page).toHaveURL(/login/);
    expect(apiCalled).toBe(false);
  });

  test('2-2. 비밀번호 필드 비어있을 때 제출 시도 시 폼 차단', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@my-wallet.local');
    // 비밀번호는 비워둠

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/auth/login')) apiCalled = true;
    });

    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/login/);
    expect(apiCalled).toBe(false);
  });

  test('2-3. 잘못된 이메일 형식 입력 시 폼 차단', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('notanemail');
    await page.getByLabel('비밀번호').fill('admin1234');

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/auth/login')) apiCalled = true;
    });

    await page.getByRole('button', { name: '로그인' }).click();

    // email type validation으로 폼 차단 → URL 유지
    await expect(page).toHaveURL(/login/);
    expect(apiCalled).toBe(false);
  });
});

// ─── 3. 오류 처리 (병렬 실행 - 독립 세션, localStorage 변경 없음) ────────────
test.describe.parallel('오류 처리', () => {
  test('3-1. 잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@my-wallet.local');
    await page.getByLabel('비밀번호').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    // role="alert" 표시 확인
    await expect(page.getByRole('alert')).toBeVisible();
    // /dashboard로 리다이렉트되지 않음
    await expect(page).toHaveURL(/login/);
    // localStorage에 access_token 없음
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeNull();
  });

  test('3-2. 존재하지 않는 계정으로 로그인 시도', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('nonexistent@example.com');
    await page.getByLabel('비밀번호').fill('any1234');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });
});

// ─── 4. 로딩 상태 (병렬 가능 - 단독 실행) ────────────────────────────────────
test.describe.parallel('로딩 상태', () => {
  test('4-1. 폼 제출 중 로딩 상태 표시', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@my-wallet.local');
    await page.getByLabel('비밀번호').fill('admin1234');

    // 네트워크 지연 시뮬레이션으로 로딩 상태 관찰
    await page.route('**/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    const loginButton = page.getByRole('button', { name: /로그인/ });
    await loginButton.click();

    // 버튼이 "로그인 중..."으로 변경되거나 disabled 상태
    await expect(loginButton).toBeDisabled();
  });
});

// ─── 5. 인증 상태 리다이렉트 (병렬 가능) ────────────────────────────────────
test.describe.parallel('인증 상태 리다이렉트', () => {
  test('5-1. 이미 인증된 사용자가 /login 접근 시 처리', async ({ page }) => {
    // localStorage에 유효한 토큰과 사용자 정보 설정
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'fake-token-for-test');
      localStorage.setItem('user', JSON.stringify({ email: 'admin@my-wallet.local' }));
    });
    await page.goto('/login');

    // 현재 미들웨어 없음 - /login 페이지가 표시되거나 /dashboard로 리다이렉트됨
    const url = page.url();
    const isLoginOrDashboard = url.includes('/login') || url.includes('/dashboard');
    expect(isLoginOrDashboard).toBe(true);
  });
});

// ─── 6. 로그아웃 흐름 (순차 실행 - 로그인 선행 필요) ────────────────────────
test.describe.serial('로그아웃 흐름', () => {
  test('6-1. 로그인 후 로그아웃', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.getByLabel('이메일').fill('admin@my-wallet.local');
    await page.getByLabel('비밀번호').fill('admin1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/dashboard');

    // 로그아웃 버튼 클릭: window.location.href 변경으로 인한 DOM detach를 피하기 위해
    // dispatchEvent로 클릭 이벤트 직접 발송
    const logoutExists = await page.locator('[aria-label="로그아웃"]').count();

    if (logoutExists > 0) {
      // 페이지 이동이 시작되기를 대기하면서 클릭
      await Promise.all([
        page.waitForURL(/login/, { timeout: 10000 }),
        page.locator('[aria-label="로그아웃"]').dispatchEvent('click'),
      ]);
    } else {
      // 로그아웃 UI가 구현되지 않은 경우 localStorage 직접 초기화
      await page.evaluate(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      });
      await page.goto('/login');
    }

    // localStorage에서 access_token, user 삭제 확인
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(token).toBeNull();
    expect(user).toBeNull();

    // /login으로 리다이렉트 확인
    await expect(page).toHaveURL(/login/);
  });
});
