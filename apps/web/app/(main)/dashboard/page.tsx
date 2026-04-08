'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmountDisplay } from '@/components/common/amount-display';
import { BudgetSummary } from '@/components/dashboard/budget-summary';
import { HoldingsSummary } from '@/components/dashboard/holdings-summary';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { useMonthlySummary, useBudgetAnalysis } from '@/hooks/use-budget';
import { usePortfolioSummary, useHoldings } from '@/hooks/use-stock';
import { useRecentActivity } from '@/hooks/use-dashboard';
import { formatPercent, formatMonth } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  loading: boolean;
}

function SummaryCard({ title, value, sub, icon, loading }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-7 w-32 rounded bg-muted" />
            {sub !== undefined && <div className="h-4 w-20 rounded bg-muted" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { summary: monthSummary, loading: summaryLoading } = useMonthlySummary(year, month);
  const { analysis, loading: analysisLoading } = useBudgetAnalysis(year, month);
  const { summary: portfolio, loading: portfolioLoading } = usePortfolioSummary();
  const { holdings, loading: holdingsLoading } = useHoldings();
  const { activities, loading: activitiesLoading } = useRecentActivity(10);

  const gainRate = portfolio?.totalUnrealizedGainRate ?? 0;
  const isGain = gainRate >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">{formatMonth(now)} 현황</p>
      </div>

      {/* Row 1: Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="이번 달 수입"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={summaryLoading}
          value={
            <AmountDisplay
              amount={monthSummary?.totalIncome ?? 0}
              className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
            />
          }
        />
        <SummaryCard
          title="이번 달 지출"
          icon={<TrendingDown className="h-4 w-4" />}
          loading={summaryLoading}
          value={
            <AmountDisplay
              amount={monthSummary?.totalExpense ?? 0}
              className="text-2xl font-bold text-red-600 dark:text-red-400"
            />
          }
          sub={
            monthSummary
              ? `저축 ${new Intl.NumberFormat('ko-KR').format(monthSummary.totalSaving)}원`
              : undefined
          }
        />
        <SummaryCard
          title="포트폴리오 평가액"
          icon={<Wallet className="h-4 w-4" />}
          loading={portfolioLoading}
          value={
            <AmountDisplay
              amount={portfolio?.totalEvaluation ?? 0}
              className="text-2xl font-bold"
            />
          }
          sub={
            portfolio
              ? `투자원금 ${new Intl.NumberFormat('ko-KR').format(portfolio.totalInvested)}원`
              : undefined
          }
        />
        <SummaryCard
          title="미실현 손익"
          icon={<PiggyBank className="h-4 w-4" />}
          loading={portfolioLoading}
          value={
            <AmountDisplay
              amount={portfolio?.totalUnrealizedGain ?? 0}
              showSign
              className={cn(
                'text-2xl font-bold',
                isGain
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            />
          }
          sub={
            portfolio
              ? formatPercent(gainRate)
              : undefined
          }
        />
      </div>

      {/* Row 2: Budget analysis + Holdings */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">예산 달성률</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetSummary analysis={analysis} loading={analysisLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">보유 종목 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <HoldingsSummary holdings={holdings} loading={holdingsLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivity activities={activities} loading={activitiesLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
