'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';
import { ACCOUNT_TYPES } from '@my-wallet/shared';
import type { AccountType } from '@my-wallet/shared';
import { useStockAccounts, useHoldings, usePerformance } from '@/hooks/use-stock';
import { HoldingsTable } from '@/components/stock/holdings-table';
import { PerformanceChart } from '@/components/stock/performance-chart';
import { AmountDisplay } from '@/components/common/amount-display';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId } = use(params);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { accounts, loading: accountsLoading } = useStockAccounts();
  const { holdings, loading: holdingsLoading } = useHoldings(accountId);
  const { performance, loading: perfLoading } = usePerformance(year, accountId);

  const account = accounts.find((a) => a.id === accountId);

  const totalUnrealizedGain = holdings.reduce((sum, h) => sum + h.unrealizedGain, 0);
  const totalEvaluation = holdings.reduce((sum, h) => sum + h.evaluation, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
  const totalRealizedGain = performance.reduce((sum, p) => sum + p.realizedGain, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stocks" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">계좌 상세</h1>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            계좌 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <div className="text-muted-foreground text-sm">불러오는 중...</div>
          ) : account ? (
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-bold">
                  {account.alias ?? account.broker}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {ACCOUNT_TYPES[account.type as AccountType]}
                  </Badge>
                  <Badge variant="secondary">{account.broker}</Badge>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div>
                  <div className="text-xs text-muted-foreground">평가금액</div>
                  <AmountDisplay amount={totalEvaluation} className="font-semibold" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">미실현 손익</div>
                  <span className={cn(
                    'font-semibold tabular-nums text-sm',
                    totalUnrealizedGain > 0 ? 'text-gain' :
                    totalUnrealizedGain < 0 ? 'text-loss' : 'text-foreground',
                  )}>
                    <AmountDisplay amount={totalUnrealizedGain} showSign />
                    {totalInvested > 0 && (
                      <span className="ml-1 text-xs">
                        ({formatPercent(((totalEvaluation - totalInvested) / totalInvested) * 100)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">계좌 정보를 찾을 수 없습니다.</div>
          )}
        </CardContent>
      </Card>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            보유 종목
            {holdings.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({holdings.length}종목)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {holdingsLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : (
            <HoldingsTable holdings={holdings} />
          )}
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            월별 실현 손익
            <span className={cn(
              'text-sm font-normal ml-1',
              totalRealizedGain > 0 ? 'text-gain' :
              totalRealizedGain < 0 ? 'text-loss' : 'text-muted-foreground',
            )}>
              (연간 합계: <AmountDisplay amount={totalRealizedGain} showSign />)
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={year <= currentYear - 5}
              onClick={() => setYear((y) => y - 1)}
              className="h-7 w-7 p-0"
            >
              ‹
            </Button>
            <span className="text-sm font-medium w-12 text-center">{year}년</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={year >= currentYear}
              onClick={() => setYear((y) => y + 1)}
              className="h-7 w-7 p-0"
            >
              ›
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {perfLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : (
            <PerformanceChart data={performance} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
