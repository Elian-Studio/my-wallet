'use client';

import { Progress } from '@/components/ui/progress';

interface BudgetCompletionMeterProps {
  completed: number;
  total: number;
  label?: string;
}

export function BudgetCompletionMeter({
  completed,
  total,
  label = '카테고리 예산 설정 진행률',
}: BudgetCompletionMeterProps) {
  const percent = total > 0 ? (completed / total) * 100 : 0;
  const allDone = total > 0 && completed === total;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            allDone
              ? 'font-semibold text-good'
              : 'font-medium tabular-nums'
          }
        >
          {completed}/{total} {allDone ? '완료 ✓' : ''}
        </span>
      </div>
      <Progress
        value={percent}
        max={100}
        aria-label={`예산 설정 ${completed}개 / 전체 ${total}개`}
      />
    </div>
  );
}
