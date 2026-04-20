# TODOS

프로젝트 follow-up 관리. 스킬/컴포넌트별 그룹, priority 순서대로 정렬 (P0 → P4 → Completed).

## Database / Migrations

### P1: Rename migration drift 해소
**Why:** `packages/database/prisma/migrations/20260409000000_rename_categories/migration.sql`가 `"Category"` (PascalCase 단수)를 참조하지만 init 마이그레이션은 `"categories"` (lowercase plural)를 생성. Prod DB 상태 불일치 가능성.
**Context:** Ship 리뷰 (2026-04-21)에서 data-migration specialist가 CRITICAL 플래그. Rename 마이그레이션이 실제로 prod에서 성공했는지, 아니면 silent no-op으로 끝났는지 확인 필요. 현재 세션의 2-depth 마이그레이션은 이것과 독립 동작 (새 `categories_parent_id_idx` 등은 정상 생성 예정).
**How to verify:** Render DB 접속 후 `\dt my_wallet.*` + `\d "categories"`로 실제 스키마 확인. 필요 시 `prisma migrate resolve --applied` 또는 수동 SQL 재적용.
**Depends on:** prod DB 접근 권한

### P3: NULLS NOT DISTINCT 전환 (PG 15+ 필요)
**Why:** 현재 `@@unique([name, type, parentId])`는 `parentId=NULL` 로우를 distinct로 간주해 루트 카테고리 중복이 DB 레벨에서 차단되지 않음. App 레이어에서만 체크.
**How:** PostgreSQL 버전이 15 이상이면 `UNIQUE INDEX ... NULLS NOT DISTINCT` 옵션 사용. 또는 partial unique index.
**Context:** 1인 가계부 스케일에선 race 발생 확률 극히 낮음, 나중에 검토.

## Backend / API

### P2: Recommendations divisor 동적 계산
**Why:** `budget-analysis.service.ts`의 `computeRecommendations`가 항상 3으로 나눔. 초기 사용자(1-2개월 이력만 보유)는 실제보다 낮게 추천받음.
**How:** 실제 데이터가 존재하는 월 수를 카운트 (distinct YYYY-MM of priorTransactions)하여 divisor로 사용. 최소 1로 clamp.
**Context:** Ship 리뷰 (2026-04-21)에서 maintainability specialist가 제안. 값 3은 RECOMMENDATION_LOOKBACK_MONTHS 상수.

### P3: DRY 리팩터 — 카테고리 트리 정렬 로직
**Why:** parent→children 순서 정렬 + 고아 승격 로직이 3곳에 중복:
  - `apps/web/components/budget/budget-form.tsx:24` `orderCategoriesForDisplay`
  - `apps/web/components/budget/transaction-form.tsx:84` inline IIFE
  - `apps/web/components/budget/budget-analysis-tree.tsx:48` `buildTree`
**How:** `apps/web/lib/categories.ts` 또는 `packages/shared/src/utils/category-tree.ts`에 통합.
**Context:** Ship 리뷰 (2026-04-21)에서 maintainability specialist가 confidence 9로 플래그.

## Frontend / Web

### P2: Web 테스트 인프라 (Vitest + RTL)
**Why:** 현재 `apps/web/`에 테스트 파일 0개. `budget-analysis-tree.tsx`, `category-editor-dialog.tsx`, 정렬 로직, flatMap 트리 렌더링 등이 manual QA에만 의존.
**How:** Vitest + @testing-library/react 도입. `apps/web/package.json`에 `test` 스크립트 + `vitest.config.ts`. 최소 5개 핵심 컴포넌트 스모크 테스트로 시작.
**Context:** 초기 설계 doc부터 NOT in scope으로 명시. 이번 ship에서 명시적으로 follow-up 전환.

### P3: 에디터 다이얼로그 prop wiring 정리
**Why:** `apps/web/app/(main)/settings/categories/page.tsx:249-272`에 중첩 삼항 9개. `deriveDialogProps(dialog, activeTab, tree)` 유틸로 추출 권장.
**Context:** Ship 리뷰 (2026-04-21), maintainability specialist 제안.

## Design / UX

### P3: Tooltip 문구 shared constant
**Why:** "부모 예산은 하위 카테고리 합계의 상한 캡..." 문구가 `budget-analysis-tree.tsx:196`와 `analysis/page.tsx:213` 두 곳에 하드코딩.
**How:** 추후 i18n 도입 시 함께 처리. 단기적으론 `apps/web/lib/copy.ts`에 상수화.

## Completed

_(Ship 이후 완료 항목이 여기 기록됨)_
