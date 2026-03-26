'use client';

import Link from 'next/link';
import type { HoldingItem } from '@my-wallet/shared';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { AmountDisplay } from '@/components/common/amount-display';
import { formatAmount, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HoldingsTableProps {
  holdings: HoldingItem[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        보유 종목이 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>종목명</TableHead>
          <TableHead className="text-right">수량</TableHead>
          <TableHead className="text-right">평균단가</TableHead>
          <TableHead className="text-right">현재가</TableHead>
          <TableHead className="text-right">평가금액</TableHead>
          <TableHead className="text-right">손익 (수익률)</TableHead>
          <TableHead className="text-right">비중</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((item) => {
          const isProfit = item.unrealizedGain > 0;
          const isLoss = item.unrealizedGain < 0;
          const gainColorClass = isProfit
            ? 'text-gain'
            : isLoss
              ? 'text-loss'
              : 'text-foreground';

          return (
            <TableRow key={item.stockId}>
              <TableCell>
                <Link
                  href={`/stocks/${item.stockId}`}
                  className="font-medium hover:underline"
                >
                  {item.stockName}
                </Link>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {item.stockCode}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.quantity.toLocaleString('ko-KR')}주
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay amount={item.avgBuyPrice} />
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay amount={item.currentPrice} />
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay amount={item.evaluation} />
              </TableCell>
              <TableCell className="text-right">
                <span className={cn('tabular-nums', gainColorClass)}>
                  {formatAmount(item.unrealizedGain)}
                </span>
                <span className={cn('ml-1 text-xs tabular-nums', gainColorClass)}>
                  ({formatPercent(item.unrealizedGainRate)})
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {item.weight.toFixed(1)}%
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
