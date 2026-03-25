'use client';

import type { TransactionType } from '@my-wallet/shared';
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
import type { Transaction } from '@/lib/api/budget';
import { Pencil, Trash2 } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: '수입',
  EXPENSE: '지출',
  SAVING: '저축',
};

const TYPE_VARIANTS: Record<TransactionType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INCOME: 'default',
  EXPENSE: 'destructive',
  SAVING: 'secondary',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        거래 내역이 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>날짜</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>제목</TableHead>
          <TableHead>유형</TableHead>
          <TableHead className="text-right">금액</TableHead>
          <TableHead className="w-20"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDate(tx.date)}
            </TableCell>
            <TableCell>{tx.category?.name ?? '-'}</TableCell>
            <TableCell>
              <span>{tx.title}</span>
              {tx.isFixed && (
                <span className="ml-1.5 text-xs text-muted-foreground">(고정)</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={TYPE_VARIANTS[tx.type]}>{TYPE_LABELS[tx.type]}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <AmountDisplay
                amount={tx.type === 'EXPENSE' ? -tx.amount : tx.amount}
                showSign
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(tx)}
                  aria-label="수정"
                  className="h-7 w-7"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(tx.id)}
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
