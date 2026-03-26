'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { MonthPicker } from '@/components/common/month-picker';
import { AmountDisplay } from '@/components/common/amount-display';
import { useMonthlySummary } from '@/hooks/use-budget';
import { Receipt, BarChart3, TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react';

export default function BudgetPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { summary, loading } = useMonthlySummary(year, month);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">가계부</h1>
        <MonthPicker value={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-gain" />
              수입
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <AmountDisplay
                amount={summary?.totalIncome ?? 0}
                className="text-2xl font-bold"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-loss" />
              지출
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <AmountDisplay
                amount={summary?.totalExpense ?? 0}
                className="text-2xl font-bold"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4" />
              저축
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <AmountDisplay
                amount={summary?.totalSaving ?? 0}
                className="text-2xl font-bold"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              잔액
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <AmountDisplay
                amount={summary?.balance ?? 0}
                showSign
                className="text-2xl font-bold"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:bg-muted/30 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              거래 내역
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              수입, 지출, 저축 내역을 기록하고 확인합니다.
            </p>
            <Link
              href="/budget/transactions"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              내역 보기
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/30 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              예산 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              카테고리별 예산 대비 실적을 분석합니다.
            </p>
            <Link
              href="/budget/analysis"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              분석 보기
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
