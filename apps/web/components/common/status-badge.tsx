import type { BudgetStatus } from '@my-wallet/shared';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: BudgetStatus;
  className?: string;
}

const statusConfig: Record<BudgetStatus, { label: string; className: string }> = {
  GOOD: {
    label: '양호',
    className: 'bg-good/10 text-good border-good/20',
  },
  WARNING: {
    label: '주의',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  OVER: {
    label: '초과',
    className: 'bg-over/10 text-over border-over/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
