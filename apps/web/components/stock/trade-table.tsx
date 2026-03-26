'use client';

import type { TradeType } from '@my-wallet/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { AmountDisplay } from '@/components/common/amount-display';
import type { Trade } from '@/lib/api/stock';
import { Pencil, Trash2 } from 'lucide-react';

interface TradeTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<TradeType, string> = {
  BUY: '매수',
  SELL: '매도',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function TradeTable({ trades, onEdit, onDelete }: TradeTableProps) {
  if (trades.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        매매 내역이 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>날짜</TableHead>
          <TableHead>종목</TableHead>
          <TableHead>계좌</TableHead>
          <TableHead>유형</TableHead>
          <TableHead className="text-right">단가</TableHead>
          <TableHead className="text-right">수량</TableHead>
          <TableHead className="text-right">총금액</TableHead>
          <TableHead>사유</TableHead>
          <TableHead className="w-20"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDate(trade.tradeDate)}
            </TableCell>
            <TableCell>
              <span className="font-medium">{trade.stock?.name ?? '-'}</span>
              {trade.stock?.code && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {trade.stock.code}
                </span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {trade.account
                ? (trade.account.alias ?? `${trade.account.broker}`)
                : '-'}
            </TableCell>
            <TableCell>
              <Badge
                variant={trade.type === 'BUY' ? 'default' : 'destructive'}
              >
                {TYPE_LABELS[trade.type]}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <AmountDisplay amount={trade.price} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {trade.quantity.toLocaleString('ko-KR')}주
            </TableCell>
            <TableCell className="text-right">
              <AmountDisplay amount={trade.totalAmount} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
              {trade.reason && trade.reason.length > 0
                ? trade.reason.join(', ')
                : '-'}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(trade)}
                  aria-label="수정"
                  className="h-7 w-7"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(trade.id)}
                  aria-label="삭제"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
