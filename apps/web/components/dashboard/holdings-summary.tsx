'use client';

import type { HoldingItem } from '@my-wallet/shared';
import { AmountDisplay } from '@/components/common/amount-display';
import { cn } from '@/lib/utils';

interface HoldingsSummaryProps {
  holdings: HoldingItem[];
  loading: boolean;
}

export function HoldingsSummary({ holdings, loading }: HoldingsSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        보유 종목이 없습니다.
      </p>
    );
  }

  const top5 = holdings.slice(0, 5);

  return (
    <div className="divide-y divide-border">
      {top5.map((holding) => {
        const isGain = holding.unrealizedGain >= 0;
        return (
          <div key={holding.stockId} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{holding.stockName}</p>
              <p className="text-xs text-muted-foreground">
                {holding.stockCode} · {holding.weight.toFixed(1)}%
              </p>
            </div>
            <div className="text-right shrink-0">
              <AmountDisplay amount={holding.evaluation} className="block text-sm font-semibold" />
              <span
                className={cn(
                  'text-xs font-medium',
                  isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                {isGain ? '+' : ''}
                {holding.unrealizedGainRate.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
