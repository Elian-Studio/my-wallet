'use client';

import type { BudgetAnalysisItem } from '@my-wallet/shared';
import { BudgetProgress } from '@/components/budget/budget-progress';

interface BudgetSummaryProps {
  analysis: BudgetAnalysisItem[];
  loading: boolean;
}

export function BudgetSummary({ analysis, loading }: BudgetSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 py-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-8 rounded bg-muted" />
            </div>
            <div className="h-2 w-full rounded-full bg-muted" />
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (analysis.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        이번 달 예산 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {analysis.map((item) => (
        <BudgetProgress key={item.categoryId} item={item} />
      ))}
    </div>
  );
}
