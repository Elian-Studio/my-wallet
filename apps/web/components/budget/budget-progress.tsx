'use client';

import type { BudgetAnalysisItem } from '@my-wallet/shared';
import { Progress } from '@/components/ui/progress';
import { AmountDisplay } from '@/components/common/amount-display';
import { StatusBadge } from '@/components/common/status-badge';
import { cn } from '@/lib/utils';

interface BudgetProgressProps {
  item: BudgetAnalysisItem;
}

export function BudgetProgress({ item }: BudgetProgressProps) {
  const rate = Math.min(item.achievementRate, 100);
  const overBudget = item.achievementRate > 100;

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{item.categoryName}</span>
          <StatusBadge status={item.status} />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {item.achievementRate.toFixed(0)}%
        </span>
      </div>
      <Progress
        value={rate}
        max={100}
        className={cn(
          'h-2',
          overBudget ? 'bg-destructive/20 [&>div]:bg-destructive' : '',
        )}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          실적 <AmountDisplay amount={item.actual} className="text-xs font-medium text-foreground" />
        </span>
        <span>
          예산 <AmountDisplay amount={item.budget} className="text-xs font-medium text-foreground" />
        </span>
      </div>
      {overBudget && (
        <p className="text-xs text-destructive">
          예산 초과:{' '}
          <AmountDisplay amount={item.actual - item.budget} className="text-xs font-medium" />
        </p>
      )}
    </div>
  );
}
