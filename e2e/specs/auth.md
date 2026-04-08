# Auth E2E 테스트 계획

## 개요
- 대상 페이지: /login
- 주요 기능:
  - 이메일/비밀번호 폼 입력 및 유효성 검사 (HTML5 required)
  - POST /auth/login API 호출 → accessToken, user를 localStorage에 저장
  - 로그인 성공 시 /dashboard로 리다이렉트
  - 로그인 실패 시 에러 메시지 표시 (`role="alert"`)
  - 로그아웃 시 localStorage 초기화 → /login으로 리다이렉트

---

## 테스트 시나리오

### 1. 정상 로그인 흐름

#### 1-1. 유효한 자격증명으로 로그인 성공
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 이메일 필드에 `admin@my-wallet.local` 입력
  2. 비밀번호 필드에 `admin1234` 입력
  3. "로그인" 버튼 클릭
- **기대 결과**:
  - /dashboard로 리다이렉트
  - localStorage에 `access_token`, `user` 키가 저장됨
  - user 객체에 `email: admin@my-wallet.local` 포함

#### 1-2. 로그인 성공 후 네비게이션 표시
- **전제조건**: 1-1 시나리오 완료 후 /dashboard
- **단계**:
  1. /dashboard 페이지 로드 확인
- **기대 결과**:
  - 페이지가 /dashboard URL을 유지함
  - /login으로 리다이렉트되지 않음

---

### 2. 입력 유효성 검사

#### 2-1. 이메일 필드 비어있을 때 제출 시도
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 이메일 필드를 비운 채로 비밀번호만 입력
  2. "로그인" 버튼 클릭
- **기대 결과**:
  - 브라우저 기본 HTML5 validation으로 폼 제출 차단
  - API 호출 발생하지 않음

#### 2-2. 비밀번호 필드 비어있을 때 제출 시도
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 이메일만 입력하고 비밀번호 필드를 비운 채로 제출
- **기대 결과**:
  - 브라우저 기본 HTML5 validation으로 폼 제출 차단
  - API 호출 발생하지 않음

#### 2-3. 잘못된 이메일 형식 입력
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 이메일 필드에 `notanemail` 입력
  2. 비밀번호 입력 후 제출
- **기대 결과**:
  - 브라우저 email type validation으로 폼 제출 차단

---

### 3. 오류 처리

#### 3-1. 잘못된 비밀번호로 로그인 실패
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 이메일 `admin@my-wallet.local` 입력
  2. 비밀번호 `wrongpassword` 입력
  3. "로그인" 버튼 클릭
- **기대 결과**:
  - `role="alert"` 요소가 표시됨
  - 에러 메시지 텍스트가 노출됨 (예: "로그인에 실패했습니다.")
  - /dashboard로 리다이렉트되지 않음
  - localStorage에 `access_token`이 저장되지 않음

#### 3-2. 존재하지 않는 계정으로 로그인 시도
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 이메일 `nonexistent@example.com` 입력
  2. 비밀번호 `any1234` 입력
  3. "로그인" 버튼 클릭
- **기대 결과**:
  - `role="alert"` 요소가 표시됨
  - 현재 페이지가 /login을 유지

---

### 4. 로딩 상태

#### 4-1. 폼 제출 중 로딩 상태 표시
- **전제조건**: 미인증 상태, /login 접근
- **단계**:
  1. 유효한 자격증명 입력
  2. "로그인" 버튼 클릭 직후 상태 확인
- **기대 결과**:
  - 버튼 텍스트가 "로그인 중..."으로 변경됨
  - 버튼이 `disabled` 상태가 됨
  - 이메일/비밀번호 Input이 `disabled` 상태가 됨

---

### 5. 인증 상태 리다이렉트

#### 5-1. 이미 인증된 사용자가 /login 접근 시
- **전제조건**: localStorage에 유효한 `access_token`과 `user` 데이터가 존재
- **단계**:
  1. localStorage에 토큰 및 사용자 정보 설정
  2. /login URL로 직접 이동
- **기대 결과**:
  - /login 페이지가 표시되거나 /dashboard로 리다이렉트됨 (현재 미들웨어 없음 — 페이지 표시가 현재 동작)

---

### 6. 로그아웃 흐름

#### 6-1. 로그인 후 로그아웃
- **전제조건**: 로그인된 상태, /dashboard 접근
- **단계**:
  1. 로그아웃 버튼 또는 기능 실행
- **기대 결과**:
  - localStorage에서 `access_token`, `user` 키 삭제됨
  - /login으로 리다이렉트됨

---

## 테스트 데이터

- **유효 계정**: `admin@my-wallet.local` / `admin1234`
- **잘못된 비밀번호**: `admin@my-wallet.local` / `wrongpassword`
- **존재하지 않는 계정**: `nonexistent@example.com` / `any1234`
- **잘못된 이메일 형식**: `notanemail`

---

## 병렬 실행 그룹

### 병렬 가능 (test.describe.parallel)
| 그룹 | 파일명 | 테스트 수 | 이유 |
|------|--------|----------|------|
| 입력 유효성 검사 | auth.spec.ts | 3 | 각 테스트가 독립적, API 호출 없음, 상태 공유 없음 |
| 오류 처리 | auth.spec.ts | 2 | 각각 독립 세션, localStorage 변경 없음 |
| 로딩 상태 | auth.spec.ts | 1 | 단독 실행, 다른 테스트에 영향 없음 |

### 순차 실행 (test.describe.serial)
| 그룹 | 파일명 | 테스트 수 | 이유 |
|------|--------|----------|------|
| 정상 로그인 흐름 | auth.spec.ts | 2 | 1-2가 1-1의 localStorage 상태에 의존 |
| 로그아웃 흐름 | auth.spec.ts | 1 | 로그인 선행 필요, 상태 의존성 존재 |
