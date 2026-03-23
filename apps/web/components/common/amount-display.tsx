import { cn } from '@/lib/utils';
import { formatAmount, formatAmountWithSign } from '@/lib/utils';

interface AmountDisplayProps {
  amount: number;
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({ amount, showSign = false, className }: AmountDisplayProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  const colorClass = isPositive
    ? 'text-gain'
    : isNegative
      ? 'text-loss'
      : 'text-foreground';

  const displayText = showSign ? formatAmountWithSign(amount) : formatAmount(amount);

  return (
    <span className={cn('tabular-nums', colorClass, className)}>
      {displayText}
    </span>
  );
}
