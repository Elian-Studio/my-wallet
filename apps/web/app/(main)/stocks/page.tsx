'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { TrendingUp, Plus, Building2 } from 'lucide-react';
import { usePortfolioSummary } from '@/hooks/use-stock';
import { useHoldings } from '@/hooks/use-stock';
import { useStockAccounts } from '@/hooks/use-stock';
import { HoldingsTable } from '@/components/stock/holdings-table';
import { AccountForm } from '@/components/stock/account-form';
import { AmountDisplay } from '@/components/common/amount-display';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function StocksPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [accountFormOpen, setAccountFormOpen] = useState(false);

  const { accounts, loading: accountsLoading, create: createAccount } = useStockAccounts();
  const { summary, loading: summaryLoading } = usePortfolioSummary(selectedAccountId);
  const { holdings, loading: holdingsLoading } = useHoldings(selectedAccountId);

  const gainClass = (value: number) =>
    cn(
      'text-2xl font-bold tabular-nums',
      value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-foreground',
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">주식 포트폴리오</h1>
        <div className="flex items-center gap-2">
          <Link href="/stocks/trades" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            매매 내역
          </Link>
          <Button variant="outline" size="sm" onClick={() => setAccountFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            계좌 추가
          </Button>
        </div>
      </div>

      {/* Account Selector */}
      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedAccountId ?? '__all__'}
          onValueChange={(v) => setSelectedAccountId(v === '__all__' ? undefined : v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체 계좌" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체 계좌</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.alias ?? `${a.broker}`}{' '}
                <span className="text-muted-foreground text-xs">({a.type})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedAccountId && (
          <Link
            href={`/stocks/accounts/${selectedAccountId}`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-xs text-muted-foreground'}
          >
            계좌 상세 보기
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 평가금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">-</div>
            ) : summary ? (
              <AmountDisplay amount={summary.totalEvaluation} className="text-2xl font-bold" />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">0원</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 투자금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">-</div>
            ) : summary ? (
              <AmountDisplay amount={summary.totalInvested} className="text-2xl font-bold" />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">0원</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              미실현 손익
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">-</div>
            ) : summary ? (
              <div>
                <AmountDisplay
                  amount={summary.totalUnrealizedGain}
                  showSign
                  className={gainClass(summary.totalUnrealizedGain)}
                />
                <div className={cn('text-sm tabular-nums mt-0.5',
                  summary.totalUnrealizedGainRate > 0 ? 'text-gain' :
                  summary.totalUnrealizedGainRate < 0 ? 'text-loss' : 'text-muted-foreground'
                )}>
                  {formatPercent(summary.totalUnrealizedGainRate)}
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">0원</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              실현 손익
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">-</div>
            ) : summary ? (
              <AmountDisplay
                amount={summary.totalRealizedGain}
                showSign
                className={gainClass(summary.totalRealizedGain)}
              />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">0원</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
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

      {/* Account Form Dialog */}
      <AccountForm
        open={accountFormOpen}
        onOpenChange={setAccountFormOpen}
        onSubmit={createAccount}
      />
    </div>
  );
}
