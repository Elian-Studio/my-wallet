'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { MonthPicker } from '@/components/common/month-picker';
import { AmountDisplay } from '@/components/common/amount-display';
import { BudgetProgress } from '@/components/budget/budget-progress';
import { useMonthlySummary, useBudgetAnalysis, useTransactions } from '@/hooks/use-budget';
import { getCategoryColor, getCategoryHex } from '@/lib/category-colors';
import {
  Receipt,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Transaction } from '@/lib/api/budget';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function BudgetPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { summary, loading: summaryLoading } = useMonthlySummary(year, month);
  const { analysis, loading: analysisLoading } = useBudgetAnalysis(year, month);

  // 최근 거래 5건: 해당 월의 첫날~마지막날 범위
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  const { data: recentData, loading: recentLoading } = useTransactions({
    page: 1,
    limit: 5,
    startDate,
    endDate,
  });
  const recentTransactions = recentData?.data ?? [];

  // 도넛 차트 데이터: 카테고리별 지출 집계
  const expenseAnalysis = analysis.filter((a) => a.actual > 0);
  const pieData = expenseAnalysis.map((item) => ({
    name: item.categoryName,
    value: item.actual,
    color: getCategoryHex(item.categoryName),
  }));

  // 예산 진행률 TOP 5 (달성률 높은 순)
  const topBudgets = [...analysis]
    .sort((a, b) => b.achievementRate - a.achievementRate)
    .slice(0, 5);

  const loading = summaryLoading || analysisLoading;

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

      {/* Charts Row: Donut + Budget Progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 카테고리별 지출 도넛 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">카테고리별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisLoading ? (
              <div className="h-48 bg-muted animate-pulse rounded" />
            ) : pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                이번 달 지출 내역이 없습니다.
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        new Intl.NumberFormat('ko-KR').format(value) + '원'
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 text-xs min-w-0">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 예산 진행률 TOP 5 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">예산 진행률</CardTitle>
            <Link
              href="/budget/analysis"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              전체 보기 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {analysisLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : topBudgets.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                설정된 예산이 없습니다.
              </div>
            ) : (
              <div className="divide-y">
                {topBudgets.map((item) => (
                  <BudgetProgress key={item.categoryId} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 거래 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            최근 거래
          </CardTitle>
          <Link
            href="/budget/transactions"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            전체 보기 <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              이번 달 거래 내역이 없습니다.
              <Link
                href="/budget/transactions"
                className={buttonVariants({ variant: 'link', size: 'sm' })}
              >
                거래 추가하기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx: Transaction) => {
                const color = getCategoryColor(tx.category?.name ?? '기타');
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-10 flex-shrink-0">
                        {formatDate(tx.date)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}
                      >
                        {tx.category?.name ?? '기타'}
                      </span>
                      <span className="text-sm truncate">{tx.title}</span>
                    </div>
                    <AmountDisplay
                      amount={tx.type === 'EXPENSE' ? -tx.amount : tx.amount}
                      showSign
                      className="text-sm font-medium flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
