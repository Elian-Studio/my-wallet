'use client';

import type { ActivityItem, ActivityType } from '@/hooks/use-dashboard';
import { AmountDisplay } from '@/components/common/amount-display';
import { cn } from '@/lib/utils';

// ─── Type badge ───────────────────────────────────────────────────────────────

const typeConfig: Record<
  ActivityType,
  { label: string; className: string }
> = {
  INCOME: { label: '수입', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EXPENSE: { label: '지출', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  SAVING: { label: '저축', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  BUY: { label: '매수', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  SELL: { label: '매도', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const cfg = typeConfig[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold shrink-0',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

// ─── RecentActivity ───────────────────────────────────────────────────────────

interface RecentActivityProps {
  activities: ActivityItem[];
  loading: boolean;
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-3 animate-pulse">
            <div className="h-5 w-10 rounded-md bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-4 w-24 rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">최근 활동이 없습니다.</p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {activities.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3">
          <ActivityTypeBadge type={item.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.description}</p>
            <p className="text-xs text-muted-foreground">{item.date}</p>
          </div>
          <AmountDisplay
            amount={item.amount}
            className="text-sm font-semibold tabular-nums"
          />
        </li>
      ))}
    </ul>
  );
}
