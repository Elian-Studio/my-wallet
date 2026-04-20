'use client';

import type { BudgetAnalysisItem, BudgetStatus } from '@my-wallet/shared';
import { StatusBadge } from '@/components/common/status-badge';

interface BudgetChartProps {
  data: BudgetAnalysisItem[];
}

const STATUS_COLORS: Record<BudgetStatus, string> = {
  GOOD: '#22c55e',
  WARNING: '#f59e0b',
  OVER: '#ef4444',
  UNSET: '#94a3b8',
};

const BUDGET_BG = '#e2e8f0';
const MAX_DISPLAY_PERCENT = 150;

function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value) + '원';
}

function CategoryBar({ item }: { item: BudgetAnalysisItem }) {
  const color = STATUS_COLORS[item.status];
  const percent = Math.min(item.achievementRate, MAX_DISPLAY_PERCENT);
  const isOver = item.achievementRate > 100;

  // 초과 시: 예산 바 안쪽(100%) + 밖으로 삐져나온 부분
  const withinPercent = isOver ? 100 : percent;
  const overflowPercent = isOver ? Math.min(item.achievementRate - 100, 50) : 0;

  return (
    <div className="space-y-1.5">
      {/* 카테고리명 + 달성률 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{item.categoryName}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {item.achievementRate}%
        </span>
      </div>

      {/* 겹침 바 */}
      <div className="relative flex items-center">
        {/* 예산 바 (배경) */}
        <div
          className="h-7 w-full rounded-md"
          style={{ backgroundColor: BUDGET_BG }}
          role="meter"
          aria-label={`${item.categoryName} 예산 달성률`}
          aria-valuenow={item.achievementRate}
          aria-valuemin={0}
          aria-valuemax={MAX_DISPLAY_PERCENT}
        >
          {/* 실적 바 (전면, 예산 범위 내) */}
          <div
            className="h-full rounded-md transition-all duration-500 ease-out"
            style={{
              width: `${withinPercent}%`,
              backgroundColor: color,
              opacity: 0.85,
            }}
          />
        </div>

        {/* 초과 시: 예산 바 밖으로 삐져나온 부분 */}
        {isOver && (
          <div
            className="h-7 rounded-r-md flex-shrink-0 transition-all duration-500 ease-out"
            style={{
              width: `${overflowPercent}%`,
              backgroundColor: STATUS_COLORS.OVER,
              opacity: 0.7,
              marginLeft: -1,
            }}
          />
        )}
      </div>

      {/* 금액 + 상태 뱃지 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          실적 {formatKRW(item.actual)} / 예산 {formatKRW(item.budget)}
        </span>
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
}

export function BudgetChart({ data }: BudgetChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BUDGET_BG }} />
          <span>예산</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.GOOD }} />
          <span>양호 (&lt;80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.WARNING }} />
          <span>경고 (80~100%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.OVER }} />
          <span>초과 (&gt;100%)</span>
        </div>
      </div>

      {/* 카테고리별 바 */}
      {data.map((item) => (
        <CategoryBar key={item.categoryId} item={item} />
      ))}
    </div>
  );
}
