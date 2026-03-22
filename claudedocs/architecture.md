# My Wallet - 통합 자산관리 서비스 아키텍처 설계서

> 최종 수정: 2026-03-22
> 상태: 설계 완료, 구현 대기

---

## 목차

1. [프로젝트 구조](#1-프로젝트-구조)
2. [DB 스키마](#2-db-스키마)
3. [API 엔드포인트](#3-api-엔드포인트)
4. [핵심 비즈니스 로직](#4-핵심-비즈니스-로직)
5. [프론트엔드 페이지 구조](#5-프론트엔드-페이지-구조)
6. [로컬 개발 환경](#6-로컬-개발-환경)
7. [확장 포인트](#7-확장-포인트)

---

## 1. 프로젝트 구조

Turborepo 기반 모노레포. 프론트엔드(Next.js)와 백엔드(NestJS)를 단일 저장소에서 관리한다.

```
my-wallet/
├── apps/
│   ├── web/                          # Next.js 15 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/               # 인증 레이아웃 그룹
│   │   │   │   └── login/
│   │   │   ├── (main)/               # 메인 레이아웃 그룹 (사이드바 포함)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── budget/
│   │   │   │   │   ├── transactions/
│   │   │   │   │   └── analysis/
│   │   │   │   ├── stocks/
│   │   │   │   │   ├── trades/
│   │   │   │   │   ├── [stockId]/
│   │   │   │   │   └── accounts/
│   │   │   │   │       └── [accountId]/
│   │   │   │   └── settings/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx              # -> /dashboard 리다이렉트
│   │   ├── components/
│   │   │   ├── common/               # Button, Modal, Table 등
│   │   │   ├── budget/               # 가계부 전용 컴포넌트
│   │   │   ├── stocks/               # 주식 전용 컴포넌트
│   │   │   └── layout/               # Sidebar, Header, Navigation
│   │   ├── hooks/
│   │   ├── lib/                      # API client, utils
│   │   ├── styles/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/               # Guards, Interceptors, Pipes, Filters
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── filters/
│       │   │   └── dto/              # 공통 DTO (Pagination 등)
│       │   ├── auth/                 # 인증 모듈
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   └── auth.guard.ts
│       │   ├── budget/               # 가계부 모듈
│       │   │   ├── budget.module.ts
│       │   │   ├── controllers/
│       │   │   │   ├── transaction.controller.ts
│       │   │   │   └── budget.controller.ts
│       │   │   ├── services/
│       │   │   │   ├── transaction.service.ts
│       │   │   │   ├── budget.service.ts
│       │   │   │   └── budget-analysis.service.ts
│       │   │   └── dto/
│       │   ├── stock/                # 주식 모듈
│       │   │   ├── stock.module.ts
│       │   │   ├── controllers/
│       │   │   │   ├── stock.controller.ts
│       │   │   │   ├── trade.controller.ts
│       │   │   │   ├── account.controller.ts
│       │   │   │   └── portfolio.controller.ts
│       │   │   ├── services/
│       │   │   │   ├── stock.service.ts
│       │   │   │   ├── trade.service.ts
│       │   │   │   ├── portfolio.service.ts
│       │   │   │   ├── fifo.service.ts
│       │   │   │   └── stock-price.service.ts
│       │   │   └── dto/
│       │   ├── migration/            # Notion 데이터 마이그레이션 (일회성)
│       │   │   ├── migration.module.ts
│       │   │   ├── migration.controller.ts
│       │   │   └── migration.service.ts
│       │   └── scheduler/            # 주가 갱신 스케줄러
│       │       ├── scheduler.module.ts
│       │       └── stock-price.scheduler.ts
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── database/                     # Prisma 스키마 + 클라이언트
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts               # 초기 데이터 (카테고리 등)
│   │   ├── index.ts                  # PrismaClient re-export
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/                       # 공유 타입, 상수, 유틸
│       ├── types/
│       │   ├── budget.ts
│       │   ├── stock.ts
│       │   └── common.ts
│       ├── constants/
│       │   ├── categories.ts
│       │   └── accounts.ts
│       ├── utils/
│       │   └── currency.ts
│       ├── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── claudedocs/                       # 설계 문서
│   └── architecture.md
├── turbo.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### Turborepo 파이프라인 설정

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

### 패키지 의존 관계

```
apps/web ──> packages/shared
         ──> packages/database (타입만 사용)

apps/api ──> packages/shared
         ──> packages/database (Prisma Client 사용)
```

---

## 2. DB 스키마

모든 테이블은 PostgreSQL의 `my_wallet` 스키마에 생성한다. 동일 `study` 데이터베이스 내에서 다른 프로젝트와 격리된다.

### Prisma Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["my_wallet"]
}

// ============================================================
// 공통
// ============================================================

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  transactions Transaction[]
  budgets      Budget[]
  trades       Trade[]
  accounts     StockAccount[]

  @@map("users")
  @@schema("my_wallet")
}

// ============================================================
// 가계부 모듈
// ============================================================

enum TransactionType {
  INCOME   // 수입
  EXPENSE  // 쓰자 (지출)
  SAVING   // 모으자 (저축/투자)

  @@schema("my_wallet")
}

model Category {
  id       String          @id @default(cuid())
  name     String          // 식비, 교통, 통신 등
  type     TransactionType // 어떤 구분에 속하는지
  sortOrder Int            @default(0) @map("sort_order")
  isActive Boolean         @default(true) @map("is_active")

  transactions Transaction[]
  budgets      Budget[]

  @@unique([name, type])
  @@map("categories")
  @@schema("my_wallet")
}

model Transaction {
  id         String          @id @default(cuid())
  userId     String          @map("user_id")
  categoryId String          @map("category_id")
  type       TransactionType
  title      String          // 항목명
  amount     Int             // 금액 (원 단위, 정수)
  date       DateTime        @db.Date
  isFixed    Boolean         @default(false) @map("is_fixed") // 고정비 여부
  memo       String?

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@index([userId, date])
  @@index([userId, type, date])
  @@index([categoryId])
  @@map("transactions")
  @@schema("my_wallet")
}

model Budget {
  id         String          @id @default(cuid())
  userId     String          @map("user_id")
  categoryId String          @map("category_id")
  type       TransactionType
  month      DateTime        @db.Date // 해당 월 (매월 1일로 저장)
  amount     Int             // 목표 금액

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId, month])
  @@index([userId, month])
  @@map("budgets")
  @@schema("my_wallet")
}

// ============================================================
// 주식 모듈
// ============================================================

enum AccountType {
  GENERAL       // 일반 위탁
  ISA           // ISA
  PENSION       // 연금저축
  IRP           // IRP

  @@schema("my_wallet")
}

enum TradeType {
  BUY
  SELL

  @@schema("my_wallet")
}

enum TradeStatus {
  HOLDING       // 보유 중 (BUY 잔량 있음)
  CLOSED        // 전량 매도 완료

  @@schema("my_wallet")
}

model Stock {
  id        String  @id @default(cuid())
  code      String  @unique          // 종목코드 (예: 005930)
  name      String                   // 종목명 (예: 삼성전자)
  market    String  @default("KRX")  // KRX, NASDAQ 등
  isActive  Boolean @default(true) @map("is_active")

  trades      Trade[]
  stockPrices StockPrice[]

  @@map("stocks")
  @@schema("my_wallet")
}

model StockAccount {
  id         String      @id @default(cuid())
  userId     String      @map("user_id")
  type       AccountType
  broker     String      // 증권사명 (키움증권, 삼성증권 등)
  alias      String?     // 계좌 별칭
  isActive   Boolean     @default(true) @map("is_active")

  createdAt DateTime @default(now()) @map("created_at")

  user   User    @relation(fields: [userId], references: [id])
  trades Trade[]

  @@unique([userId, type, broker])
  @@map("stock_accounts")
  @@schema("my_wallet")
}

/// 개별 매매 거래 레코드.
/// 기존 Notion 매매일지에서는 매수+매도가 한 Row였으나,
/// 여기서는 BUY/SELL을 개별 레코드로 분리하여 분할매매를 완벽히 추적한다.
model Trade {
  id           String      @id @default(cuid())
  userId       String      @map("user_id")
  stockId      String      @map("stock_id")
  accountId    String      @map("account_id")
  type         TradeType   // BUY 또는 SELL
  tradeDate    DateTime    @map("trade_date") @db.Date
  price        Int         // 매매 단가 (원)
  quantity     Int         // 매매 수량
  reason       String[]    // 매매 이유 (다중 태그)
  memo         String?     // 매매 복기

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user    User         @relation(fields: [userId], references: [id])
  stock   Stock        @relation(fields: [stockId], references: [id])
  account StockAccount @relation(fields: [accountId], references: [id])

  // FIFO 매칭 관계
  realizedGainsAsBuy  RealizedGain[] @relation("BuyTrade")
  realizedGainsAsSell RealizedGain[] @relation("SellTrade")

  @@index([userId, stockId, type, tradeDate])
  @@index([accountId])
  @@index([tradeDate])
  @@map("trades")
  @@schema("my_wallet")
}

/// FIFO 기반 실현손익 매칭 테이블.
/// SELL 거래 발생 시 가장 오래된 BUY 로트부터 차감하며,
/// 각 매칭의 수량과 단가를 기록하여 정확한 실현손익을 추적한다.
model RealizedGain {
  id          String @id @default(cuid())
  buyTradeId  String @map("buy_trade_id")
  sellTradeId String @map("sell_trade_id")
  quantity    Int    // 이 매칭에서 소화된 수량
  buyPrice    Int    @map("buy_price")   // 매수 단가 (Trade에서 복사, 비정규화)
  sellPrice   Int    @map("sell_price")  // 매도 단가
  gain        Int    // (sellPrice - buyPrice) * quantity

  createdAt DateTime @default(now()) @map("created_at")

  buyTrade  Trade @relation("BuyTrade", fields: [buyTradeId], references: [id])
  sellTrade Trade @relation("SellTrade", fields: [sellTradeId], references: [id])

  @@index([buyTradeId])
  @@index([sellTradeId])
  @@map("realized_gains")
  @@schema("my_wallet")
}

/// 주가 캐시. 외부 API(KRX, Yahoo Finance) 호출 결과를 저장한다.
model StockPrice {
  id        String   @id @default(cuid())
  stockId   String   @map("stock_id")
  price     Int      // 현재가 (원)
  change    Int      @default(0)    // 전일 대비 변동
  changeRate Float   @default(0)    @map("change_rate") // 전일 대비 변동률 (%)
  fetchedAt DateTime @map("fetched_at") // 조회 시점

  stock Stock @relation(fields: [stockId], references: [id])

  @@unique([stockId])
  @@map("stock_prices")
  @@schema("my_wallet")
}
```

### 스키마 설계 핵심 결정사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 금액 타입 | `Int` (원 단위 정수) | 원화는 소수점 없음. Decimal 불필요. |
| Trade 분리 | BUY/SELL 개별 레코드 | 분할매수/매도 추적 가능. 기존 Notion의 1Row=1거래쌍 한계 해소. |
| RealizedGain 테이블 | 별도 매칭 테이블 | FIFO 로트 매칭 이력 보존. 실현손익 재계산 불필요. |
| Category | 테이블 (enum 아님) | 향후 카테고리 추가/수정 유연성 확보. |
| StockPrice | 단일 레코드/종목 | 히스토리 불필요, 최신 시세만 캐시. |
| 스키마 격리 | `my_wallet` PostgreSQL 스키마 | 공유 DB 내 프로젝트 격리. |

### Notion 데이터 -> 새 스키마 매핑

```
[Notion 가계부 기록]              [Transaction]
  항목          ->                  title
  금액          ->                  amount
  날짜          ->                  date
  구분(쓰자/모으자/수입) ->         type (EXPENSE/SAVING/INCOME)
  카테고리       ->                  categoryId (FK)
  고정비         ->                  isFixed
  메모          ->                  memo

[Notion 예산 목표]                [Budget]
  카테고리       ->                  categoryId (FK)
  구분          ->                  type
  월            ->                  month
  목표 금액      ->                  amount
  (실제 사용, 달성 여부는 쿼리로 실시간 계산)

[Notion 매매일지]                 [Trade] (1 Row -> 최대 2 Records)
  종목명/종목코드  ->                stockId (FK -> Stock)
  계좌/증권사     ->                accountId (FK -> StockAccount)
  매수 일자/단가/수량 ->            Trade (type=BUY)
  매도 일자/단가/수량 ->            Trade (type=SELL) -- 매도 정보가 있는 경우만
  매수/매도 이유   ->               reason[]
  매매 복기       ->                memo
```

---

## 3. API 엔드포인트

Base URL: `/api/v1`

### 3.1 인증 (Auth)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/login` | 로그인 (JWT 발급) |
| POST | `/auth/refresh` | 토큰 갱신 |
| GET | `/auth/me` | 현재 사용자 정보 |

1인 사용이므로 JWT 기반 간단 인증. 회원가입은 seed로 처리.

### 3.2 가계부 - 거래 (Transactions)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/transactions` | 거래 목록 조회 |
| POST | `/transactions` | 거래 등록 |
| GET | `/transactions/:id` | 거래 상세 |
| PUT | `/transactions/:id` | 거래 수정 |
| DELETE | `/transactions/:id` | 거래 삭제 |

**GET `/transactions` 쿼리 파라미터:**

```
?month=2026-03          # 월별 필터 (필수)
&type=EXPENSE           # 구분 필터 (선택)
&categoryId=xxx         # 카테고리 필터 (선택)
&isFixed=true           # 고정비 필터 (선택)
&page=1&limit=50        # 페이지네이션
```

### 3.3 가계부 - 예산 (Budgets)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/budgets` | 예산 목록 조회 |
| POST | `/budgets` | 예산 설정 (벌크 가능) |
| PUT | `/budgets/:id` | 예산 수정 |
| DELETE | `/budgets/:id` | 예산 삭제 |
| GET | `/budgets/analysis` | 예산 대비 실적 분석 |

**POST `/budgets` 요청 바디 (벌크 생성/수정):**

```typescript
{
  month: "2026-03-01",
  items: [
    { categoryId: "xxx", type: "EXPENSE", amount: 300000 },
    { categoryId: "yyy", type: "SAVING", amount: 500000 },
  ]
}
```

**GET `/budgets/analysis?month=2026-03` 응답:**

```typescript
{
  month: "2026-03",
  summary: {
    totalBudgetExpense: 2000000,   // 지출 예산 합계
    totalActualExpense: 1850000,   // 실제 지출 합계
    totalBudgetSaving: 1000000,    // 저축 예산 합계
    totalActualSaving: 900000,     // 실제 저축 합계
    totalIncome: 4500000,          // 총 수입
  },
  categories: [
    {
      categoryId: "xxx",
      categoryName: "식비",
      type: "EXPENSE",
      budget: 300000,
      actual: 280000,
      difference: 20000,           // 양수=절약, 음수=초과
      achievementRate: 93.3,       // 달성률 (%)
      status: "GOOD"              // GOOD | WARNING | OVER
    },
    // ...
  ]
}
```

### 3.4 가계부 - 카테고리 (Categories)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/categories` | 카테고리 목록 |

### 3.5 주식 - 종목 (Stocks)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/stocks` | 종목 목록 |
| POST | `/stocks` | 종목 등록 |
| PUT | `/stocks/:id` | 종목 수정 |
| GET | `/stocks/:id/price` | 종목 현재가 조회 (캐시) |

### 3.6 주식 - 계좌 (Accounts)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/stock-accounts` | 계좌 목록 |
| POST | `/stock-accounts` | 계좌 등록 |
| PUT | `/stock-accounts/:id` | 계좌 수정 |

### 3.7 주식 - 매매 (Trades)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/trades` | 매매 목록 조회 |
| POST | `/trades` | 매매 등록 |
| GET | `/trades/:id` | 매매 상세 |
| PUT | `/trades/:id` | 매매 수정 |
| DELETE | `/trades/:id` | 매매 삭제 |

**GET `/trades` 쿼리 파라미터:**

```
?stockId=xxx            # 종목 필터
&accountId=xxx          # 계좌 필터
&type=BUY               # 매수/매도 필터
&from=2026-01-01        # 기간 시작
&to=2026-03-31          # 기간 종료
&page=1&limit=50
```

**POST `/trades` 핵심 동작:**
- `type=BUY`: Trade 레코드 생성.
- `type=SELL`: Trade 레코드 생성 + FIFO 알고리즘으로 RealizedGain 레코드 자동 생성.

### 3.8 주식 - 포트폴리오 (Portfolio)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/portfolio` | 포트폴리오 종합 요약 |
| GET | `/portfolio/holdings` | 종목별 보유 현황 |
| GET | `/portfolio/holdings/:stockId` | 특정 종목 상세 (매매 이력 포함) |
| GET | `/portfolio/accounts/:accountId` | 계좌별 포트폴리오 |
| GET | `/portfolio/performance` | 기간별 실현 손익 |

**GET `/portfolio/holdings` 응답:**

```typescript
{
  totalEvaluation: 25000000,       // 총 평가금액
  totalInvested: 22000000,         // 총 투자원금
  totalUnrealizedGain: 3000000,    // 총 평가손익
  totalUnrealizedGainRate: 13.6,   // 총 평가손익률 (%)
  totalRealizedGain: 1500000,      // 총 실현손익
  holdings: [
    {
      stockId: "xxx",
      stockName: "삼성전자",
      stockCode: "005930",
      quantity: 100,                // 보유 수량
      avgBuyPrice: 72000,           // 평균 매수가
      currentPrice: 75000,          // 현재가
      evaluation: 7500000,          // 평가금액
      invested: 7200000,            // 투자원금
      unrealizedGain: 300000,       // 평가손익
      unrealizedGainRate: 4.17,     // 평가손익률 (%)
      weight: 30.0,                 // 포트폴리오 비중 (%)
      accounts: [                   // 계좌별 분포
        { accountId: "a1", type: "ISA", broker: "키움증권", quantity: 60 },
        { accountId: "a2", type: "GENERAL", broker: "삼성증권", quantity: 40 }
      ]
    },
    // ...
  ]
}
```

**GET `/portfolio/performance?from=2026-01&to=2026-03` 응답:**

```typescript
{
  period: { from: "2026-01-01", to: "2026-03-31" },
  totalRealizedGain: 1500000,
  monthly: [
    { month: "2026-01", realizedGain: 500000, tradeCount: 5 },
    { month: "2026-02", realizedGain: 800000, tradeCount: 3 },
    { month: "2026-03", realizedGain: 200000, tradeCount: 2 },
  ],
  byStock: [
    { stockName: "삼성전자", realizedGain: 1200000, realizedGainRate: 8.5 },
    { stockName: "카카오", realizedGain: 300000, realizedGainRate: 5.2 },
  ]
}
```

### 3.9 마이그레이션 (일회성)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/migration/notion/transactions` | Notion 가계부 데이터 가져오기 |
| POST | `/migration/notion/budgets` | Notion 예산 데이터 가져오기 |
| POST | `/migration/notion/trades` | Notion 매매일지 가져오기 |

---

## 4. 핵심 비즈니스 로직

### 4.1 FIFO 실현이익 계산 알고리즘

SELL 거래 등록 시 자동으로 실행되는 핵심 알고리즘이다. 동일 종목 + 동일 계좌 범위 내에서 FIFO(선입선출) 방식으로 매수 로트를 소진한다.

```typescript
/**
 * FIFO 실현이익 계산
 *
 * @param sellTrade - 새로 등록된 SELL 거래
 * @returns RealizedGain[] - 생성된 매칭 레코드 목록
 * @throws InsufficientHoldingsError - 보유 수량 부족 시
 */
async function calculateFifoGains(sellTrade: Trade): Promise<RealizedGain[]> {
  // 1. 동일 종목+계좌의 BUY 거래를 날짜순 조회
  const buyTrades = await getBuyTrades(
    sellTrade.stockId,
    sellTrade.accountId,
    { orderBy: { tradeDate: 'asc' } }
  );

  // 2. 각 BUY 로트의 잔여 수량 계산
  //    (매수 수량 - 기존 RealizedGain에서 이미 소화된 수량)
  const lotsWithRemaining = await Promise.all(
    buyTrades.map(async (buy) => {
      const allocated = await sumAllocatedQuantity(buy.id);
      return {
        trade: buy,
        remaining: buy.quantity - allocated,
      };
    })
  );

  // 3. FIFO 순서로 SELL 수량 차감
  let sellRemaining = sellTrade.quantity;
  const gains: RealizedGain[] = [];

  for (const lot of lotsWithRemaining) {
    if (sellRemaining <= 0) break;
    if (lot.remaining <= 0) continue;

    const matchQuantity = Math.min(lot.remaining, sellRemaining);

    gains.push({
      buyTradeId: lot.trade.id,
      sellTradeId: sellTrade.id,
      quantity: matchQuantity,
      buyPrice: lot.trade.price,
      sellPrice: sellTrade.price,
      gain: (sellTrade.price - lot.trade.price) * matchQuantity,
    });

    sellRemaining -= matchQuantity;
  }

  // 4. 보유 수량 부족 검증
  if (sellRemaining > 0) {
    throw new InsufficientHoldingsError(
      `보유 수량 부족: ${sellRemaining}주 초과 매도 시도`
    );
  }

  // 5. RealizedGain 레코드 벌크 생성 (트랜잭션 내)
  return await createRealizedGains(gains);
}
```

**SELL 거래 등록 전체 흐름 (트랜잭션):**

```
POST /trades (type=SELL)
  |
  ├─ [검증] 보유 수량 >= 매도 수량 확인
  ├─ [생성] Trade 레코드 INSERT
  ├─ [계산] FIFO 알고리즘 실행
  ├─ [생성] RealizedGain 레코드들 INSERT
  └─ [응답] Trade + 실현손익 요약 반환
```

모든 과정은 단일 DB 트랜잭션으로 감싸서 원자성을 보장한다.

**SELL 거래 삭제/수정 시:**
- 해당 SELL에 연결된 RealizedGain 레코드를 먼저 삭제
- 수정의 경우 재계산

### 4.2 보유 현황 집계 로직

보유 수량은 별도 테이블 없이 Trade + RealizedGain에서 실시간 계산한다.

```typescript
/**
 * 종목별 보유 현황 계산
 */
async function getHolding(stockId: string, accountId?: string) {
  // 총 매수 수량
  const totalBought = await db.trade.aggregate({
    where: { stockId, accountId, type: 'BUY' },
    _sum: { quantity: true },
  });

  // 총 매도 수량
  const totalSold = await db.trade.aggregate({
    where: { stockId, accountId, type: 'SELL' },
    _sum: { quantity: true },
  });

  const holdingQuantity =
    (totalBought._sum.quantity ?? 0) - (totalSold._sum.quantity ?? 0);

  // 평균 매수가 계산 (잔여 로트 기준 가중평균)
  const avgBuyPrice = await calculateWeightedAvgPrice(stockId, accountId);

  return { holdingQuantity, avgBuyPrice };
}

/**
 * 잔여 로트 기준 가중평균 매수가
 * FIFO 소진 후 남은 로트들의 가중평균
 */
async function calculateWeightedAvgPrice(
  stockId: string,
  accountId?: string,
): Promise<number> {
  const buyTrades = await getBuyTrades(stockId, accountId, {
    orderBy: { tradeDate: 'asc' },
  });

  let totalCost = 0;
  let totalQuantity = 0;

  for (const buy of buyTrades) {
    const allocated = await sumAllocatedQuantity(buy.id);
    const remaining = buy.quantity - allocated;

    if (remaining > 0) {
      totalCost += buy.price * remaining;
      totalQuantity += remaining;
    }
  }

  return totalQuantity > 0 ? Math.round(totalCost / totalQuantity) : 0;
}
```

### 4.3 예산 분석 로직

```typescript
/**
 * 월별 예산 대비 실적 분석
 */
async function analyzeBudget(userId: string, month: Date) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  // 해당 월 예산 목록
  const budgets = await db.budget.findMany({
    where: { userId, month: startOfMonth },
    include: { category: true },
  });

  // 해당 월 거래 집계 (카테고리별)
  const actuals = await db.transaction.groupBy({
    by: ['categoryId', 'type'],
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  });

  // 예산 vs 실적 매칭
  const analysis = budgets.map((budget) => {
    const actual = actuals.find(
      (a) => a.categoryId === budget.categoryId && a.type === budget.type,
    );
    const actualAmount = actual?._sum.amount ?? 0;
    const difference = budget.amount - actualAmount;
    const achievementRate =
      budget.amount > 0
        ? Math.round((actualAmount / budget.amount) * 1000) / 10
        : 0;

    // 상태 판정
    let status: 'GOOD' | 'WARNING' | 'OVER';
    if (budget.type === 'EXPENSE') {
      // 지출: 예산 이하면 GOOD
      status =
        achievementRate <= 80
          ? 'GOOD'
          : achievementRate <= 100
            ? 'WARNING'
            : 'OVER';
    } else {
      // 저축: 목표 이상이면 GOOD
      status =
        achievementRate >= 100
          ? 'GOOD'
          : achievementRate >= 80
            ? 'WARNING'
            : 'OVER';
    }

    return {
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      type: budget.type,
      budget: budget.amount,
      actual: actualAmount,
      difference,
      achievementRate,
      status,
    };
  });

  return analysis;
}
```

**상태 판정 기준:**

| 구분 | GOOD | WARNING | OVER |
|------|------|---------|------|
| 지출 (EXPENSE) | 달성률 <= 80% | 80% < 달성률 <= 100% | 달성률 > 100% |
| 저축 (SAVING) | 달성률 >= 100% | 80% <= 달성률 < 100% | 달성률 < 80% |

### 4.4 주가 캐싱 전략

```
[요청 흐름]

GET /stocks/:id/price
  |
  ├─ StockPrice 테이블에서 캐시 조회
  ├─ 캐시 유효? ──YES──> 캐시 반환
  └─ 캐시 만료? ──YES──> 외부 API 호출 -> StockPrice UPSERT -> 반환
```

**TTL (Time-To-Live) 정책:**

| 시간대 | TTL | 근거 |
|--------|-----|------|
| 장중 (평일 09:00-15:30 KST) | 5분 | 실시간에 가까운 시세 필요 |
| 장외 (평일 15:30 이후) | 1시간 | 종가 확정 후 변동 없음 |
| 주말/공휴일 | 24시간 | 변동 없음 |

**백그라운드 갱신 (NestJS @Cron):**

```typescript
@Injectable()
export class StockPriceScheduler {
  // 장중: 5분마다 보유 종목 시세 일괄 갱신
  @Cron('*/5 9-15 * * 1-5', { timeZone: 'Asia/Seoul' })
  async refreshDuringMarketHours() {
    const holdingStocks = await this.getActiveHoldingStocks();
    await Promise.allSettled(
      holdingStocks.map((stock) => this.stockPriceService.fetch(stock.id)),
    );
  }

  // 장 마감 직후: 종가 확정
  @Cron('0 16 * * 1-5', { timeZone: 'Asia/Seoul' })
  async refreshAtClose() {
    const holdingStocks = await this.getActiveHoldingStocks();
    await Promise.allSettled(
      holdingStocks.map((stock) => this.stockPriceService.fetch(stock.id)),
    );
  }
}
```

**외부 API 우선순위:**

1. **KRX 공공데이터**: 국내 주식 우선. 무료이지만 호출 제한 있음.
2. **Yahoo Finance**: KRX 실패 시 폴백. 해외 주식 대응 가능.

```typescript
async function fetchStockPrice(stock: Stock): Promise<PriceData> {
  try {
    // 국내 주식: KRX API 우선
    if (stock.market === 'KRX') {
      return await krxApi.getPrice(stock.code);
    }
  } catch (error) {
    logger.warn(`KRX API 실패, Yahoo Finance 폴백: ${stock.code}`);
  }

  // 폴백: Yahoo Finance
  return await yahooFinanceApi.getPrice(stock.code);
}
```

---

## 5. 프론트엔드 페이지 구조

### 5.1 라우팅 맵

```
/                           -> /dashboard 리다이렉트
/login                      -> 로그인 페이지

/dashboard                  -> 통합 대시보드
  ├── 이번 달 수입/지출 요약 카드
  ├── 예산 달성률 Progress Bar
  ├── 포트폴리오 총 평가액/손익
  └── 최근 거래 내역 (가계부 + 매매)

/budget                     -> 가계부 메인 (이번 달 요약)
/budget/transactions        -> 거래 내역 CRUD
/budget/analysis            -> 예산 대비 분석 차트

/stocks                     -> 포트폴리오 메인 (보유 현황)
/stocks/trades              -> 매매 내역 CRUD
/stocks/[stockId]           -> 종목 상세 (매매 이력, 손익)
/stocks/accounts/[accountId] -> 계좌별 보유 현황

/settings                   -> 설정 (카테고리 관리, 계좌 관리)
```

### 5.2 주요 컴포넌트 구성

```
components/
├── common/
│   ├── DataTable.tsx            # 범용 테이블 (정렬, 페이지네이션)
│   ├── MonthPicker.tsx          # 월 선택기 (가계부/분석에서 공통)
│   ├── AmountDisplay.tsx        # 금액 표시 (+/- 색상, 원화 포맷)
│   ├── StatusBadge.tsx          # GOOD/WARNING/OVER 배지
│   ├── Modal.tsx                # 범용 모달
│   ├── ConfirmDialog.tsx        # 삭제 확인
│   └── EmptyState.tsx           # 데이터 없음 상태
│
├── budget/
│   ├── TransactionForm.tsx      # 거래 등록/수정 폼
│   ├── TransactionList.tsx      # 거래 목록 (필터 포함)
│   ├── BudgetGrid.tsx           # 카테고리별 예산 설정 그리드
│   ├── BudgetAnalysisChart.tsx  # 예산 대비 실적 바 차트
│   ├── MonthSummaryCard.tsx     # 월 요약 카드 (수입/지출/저축)
│   ├── CategoryBreakdown.tsx    # 카테고리별 파이 차트
│   └── TrendChart.tsx           # 월별 추이 라인 차트
│
├── stocks/
│   ├── TradeForm.tsx            # 매매 등록/수정 폼
│   ├── TradeList.tsx            # 매매 내역 목록
│   ├── HoldingTable.tsx         # 보유 현황 테이블
│   ├── HoldingCard.tsx          # 종목별 보유 카드
│   ├── PortfolioSummaryCard.tsx # 포트폴리오 총 평가 카드
│   ├── GainLossDisplay.tsx      # 손익 표시 (빨강/파랑)
│   ├── AccountTabs.tsx          # 계좌별 탭 전환
│   ├── StockDetailPanel.tsx     # 종목 상세 (차트 + 매매이력)
│   └── PerformanceChart.tsx     # 기간별 손익 차트
│
└── layout/
    ├── Sidebar.tsx              # 사이드바 네비게이션
    ├── Header.tsx               # 상단 헤더
    └── MobileNav.tsx            # 모바일 하단 네비게이션
```

### 5.3 상태 관리 및 데이터 페칭

- **Server Components** 기본. 서버에서 데이터를 직접 fetch.
- **Client Components**: 폼 입력, 차트, 인터랙션이 필요한 부분만.
- **데이터 페칭**: Next.js `fetch` with `revalidate` 또는 `server actions`.
- **차트 라이브러리**: Recharts (가볍고 React 친화적).
- **UI 프레임워크**: Tailwind CSS + shadcn/ui (접근성, 일관성).

---

## 6. 로컬 개발 환경

### 6.1 공유 Docker PostgreSQL 활용

기존 `/Users/mobidok/Study/docker-compose.yml`의 PostgreSQL 인스턴스를 그대로 사용한다. 별도 컨테이너를 띄우지 않는다.

**스키마 격리 방식:** `study` 데이터베이스 안에 `my_wallet` 스키마를 생성하여 다른 프로젝트(good_hospital 등)와 격리한다.

### 6.2 init-db 스크립트 추가

`/Users/mobidok/Study/init-db/02-create-my-wallet-schema.sql`:

```sql
-- My Wallet 프로젝트용 스키마 생성
-- study 데이터베이스 내에서 스키마 분리
\c study;
CREATE SCHEMA IF NOT EXISTS my_wallet;

-- study 유저에게 my_wallet 스키마 권한 부여
GRANT ALL ON SCHEMA my_wallet TO study;
GRANT ALL ON ALL TABLES IN SCHEMA my_wallet TO study;
ALTER DEFAULT PRIVILEGES IN SCHEMA my_wallet GRANT ALL ON TABLES TO study;
```

> **참고:** init-db 스크립트는 PostgreSQL 컨테이너 최초 생성 시에만 실행된다. 이미 볼륨이 존재하는 경우 수동으로 스키마를 생성하거나, `prisma migrate dev`가 자동으로 생성한다.

수동 생성 명령:

```bash
docker exec -i study-postgres psql -U study -d study -c "CREATE SCHEMA IF NOT EXISTS my_wallet;"
```

### 6.3 환경 변수 설정

`.env.example`:

```env
# Database (로컬 개발: 공유 Docker PostgreSQL)
DATABASE_URL="postgresql://study:study1234@localhost:5432/study?schema=my_wallet"

# Auth
JWT_SECRET="local-dev-jwt-secret-change-in-production"

# Stock Price APIs
KRX_API_KEY=""
YAHOO_FINANCE_API_KEY=""

# App
API_PORT=3001
WEB_PORT=3000
NODE_ENV=development
```

### 6.4 개발 서버 실행 순서

```bash
# 1. 공유 PostgreSQL이 떠 있는지 확인
docker ps | grep study-postgres

# 아직 안 떠있으면 시작
cd /Users/mobidok/Study && docker compose up -d

# 2. 의존성 설치
cd /Users/mobidok/Study/my-wallet && pnpm install

# 3. Prisma 클라이언트 생성 + 마이그레이션
pnpm turbo db:generate
pnpm turbo db:migrate

# 4. 시드 데이터 (카테고리, 사용자)
pnpm --filter database db:seed

# 5. 개발 서버 시작 (Next.js + NestJS 동시)
pnpm turbo dev
```

### 6.5 패키지 매니저

pnpm workspaces 사용. Turborepo와 조합하여 빌드 캐시 활용.

루트 `package.json`:

```jsonc
{
  "name": "my-wallet",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:seed": "pnpm --filter database db:seed"
  },
  "devDependencies": {
    "turbo": "^2.x"
  },
  "packageManager": "pnpm@9.x"
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 7. 확장 포인트

### 7.1 새 금융 모듈 추가 패턴 (예: 적금)

모든 금융 모듈은 동일한 구조를 따른다. 적금 모듈을 예시로 설명한다.

**Step 1: DB 스키마 추가** (`packages/database/prisma/schema.prisma`)

```prisma
model SavingsAccount {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  bank        String                          // 은행명
  productName String   @map("product_name")   // 상품명
  interestRate Float   @map("interest_rate")  // 금리 (%)
  monthlyAmount Int    @map("monthly_amount") // 월 납입액
  startDate   DateTime @map("start_date") @db.Date
  endDate     DateTime @map("end_date") @db.Date
  isActive    Boolean  @default(true) @map("is_active")

  user     User @relation(fields: [userId], references: [id])
  payments SavingsPayment[]

  @@map("savings_accounts")
  @@schema("my_wallet")
}

model SavingsPayment {
  id               String   @id @default(cuid())
  savingsAccountId String   @map("savings_account_id")
  paymentDate      DateTime @map("payment_date") @db.Date
  amount           Int
  round            Int      // 회차

  savingsAccount SavingsAccount @relation(fields: [savingsAccountId], references: [id])

  @@map("savings_payments")
  @@schema("my_wallet")
}
```

**Step 2: 백엔드 NestJS 모듈 생성** (`apps/api/src/savings/`)

```
savings/
├── savings.module.ts
├── controllers/
│   └── savings.controller.ts
├── services/
│   └── savings.service.ts
└── dto/
    ├── create-savings.dto.ts
    └── update-savings.dto.ts
```

**Step 3: 프론트엔드 라우트 추가**

```
app/(main)/savings/
├── page.tsx                  # 적금 목록/요약
├── [savingsId]/
│   └── page.tsx              # 적금 상세 (납입 이력)
└── components/
    ├── SavingsCard.tsx
    └── PaymentHistory.tsx
```

**Step 4: 사이드바 네비게이션에 메뉴 추가**

이 패턴을 따르면 새 금융 모듈(펀드, 부동산, 보험 등)을 추가할 때 기존 코드 수정 없이 확장할 수 있다.

### 7.2 확장 고려사항

| 확장 항목 | 현재 설계 | 확장 시 변경점 |
|-----------|-----------|---------------|
| 다중 사용자 | User 모델 존재, userId FK 적용 | 인증 강화 (OAuth 등) |
| 해외 주식 | Stock.market 필드 | Yahoo Finance API 활용, 환율 모듈 추가 |
| 배당금 추적 | 미포함 | Dividend 모델 추가, Stock에 연결 |
| 알림 기능 | 미포함 | Notification 모듈, 예산 초과/목표가 알림 |
| 데이터 내보내기 | 미포함 | Export 모듈 (CSV, Excel) |
| 모바일 앱 | 반응형 웹 | API는 그대로, React Native 또는 PWA |

### 7.3 Notion 마이그레이션 전략

일회성 작업이지만, 데이터 정합성이 중요하므로 단계별로 진행한다.

```
[마이그레이션 순서]

1. 마스터 데이터 먼저
   Category (13종) -> seed.ts
   Stock (17종목) -> Notion에서 추출
   StockAccount (4개 계좌) -> Notion에서 추출

2. 가계부 데이터
   Notion 가계부 DB -> Transaction 테이블
   Notion 예산 DB -> Budget 테이블

3. 매매일지 데이터 (가장 복잡)
   Notion 매매일지 1 Row ->
     ├── Trade (type=BUY): 매수 일자/단가/수량
     ├── Trade (type=SELL): 매도 일자/단가/수량 (매도 정보가 있는 경우만)
     └── RealizedGain: 매수+매도 쌍이 있는 경우 FIFO 계산

4. 검증
   - 총 매수금액 합산 비교
   - 총 매도금액 합산 비교
   - 보유 현황 비교
```

**Notion API 호출:** `@notionhq/client` 패키지로 Notion DB를 쿼리하고, 변환 로직을 통해 새 스키마에 맞게 INSERT한다.

---

## 부록: 기술 스택 요약

| 영역 | 기술 | 버전 (권장) |
|------|------|-------------|
| 모노레포 | Turborepo + pnpm | Turbo 2.x, pnpm 9.x |
| 프론트엔드 | Next.js (App Router) | 15.x |
| UI | Tailwind CSS + shadcn/ui | Tailwind 4.x |
| 차트 | Recharts | 2.x |
| 백엔드 | NestJS | 11.x |
| ORM | Prisma | 6.x |
| DB | PostgreSQL | 16 (Docker) |
| 인증 | JWT (jsonwebtoken) | - |
| 주가 API | KRX 공공데이터, Yahoo Finance | - |
| 테스트 | Jest (API), Vitest (Web) | - |
| 언어 | TypeScript | 5.x |
