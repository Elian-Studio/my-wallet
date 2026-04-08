'use client';

import type { TransactionType } from '@my-wallet/shared';
import { Button } from '@/components/ui/button';
import { AmountDisplay } from '@/components/common/amount-display';
import { getCategoryColor } from '@/lib/category-colors';
import { groupByDate } from '@/lib/date-utils';
import type { Transaction } from '@/lib/api/budget';
import { Pencil, Trash2, Plus } from 'lucide-react';

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

/** 스켈레톤 UI: 로딩 중 표시 */
export function TransactionSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-3">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          {[1, 2].map((item) => (
            <div key={item} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 빈 상태 안내 */
export function TransactionEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm mb-1">
        아직 거래가 없어요.
      </p>
      <p className="text-muted-foreground text-xs mb-4">
        추가 버튼으로 첫 거래를 입력해보세요.
      </p>
      {onAdd && (
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          거래 추가
        </Button>
      )}
    </div>
  );
}

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  if (transactions.length === 0) {
    return <TransactionEmpty />;
  }

  const groups = groupByDate(transactions);

  return (
    <div className="divide-y">
      {groups.map((group) => {
        const groupTotal = group.items.reduce((sum, tx) => {
          return sum + (tx.type === 'EXPENSE' ? -tx.amount : tx.amount);
        }, 0);

        return (
          <div key={group.date} className="py-3 px-4">
            {/* 날짜 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {group.label}
              </span>
              <AmountDisplay
                amount={groupTotal}
                showSign
                className="text-xs"
              />
            </div>

            {/* 거래 목록 */}
            <div className="space-y-1">
              {group.items.map((tx) => {
                const color = getCategoryColor(tx.category?.name ?? '기타');
                return (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 카테고리 뱃지 */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0 ${color.bg} ${color.text}`}
                      >
                        {TYPE_LABELS[tx.type]}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {tx.title}
                          </span>
                          {tx.isFixed && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                              고정
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`${color.text}`}>
                            {tx.category?.name ?? '기타'}
                          </span>
                          {tx.memo && (
                            <>
                              <span>·</span>
                              <span className="truncate">{tx.memo}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <AmountDisplay
                        amount={tx.type === 'EXPENSE' ? -tx.amount : tx.amount}
                        showSign
                        className="text-sm font-semibold"
                      />
                      {/* 편집/삭제 버튼: hover 시 표시 */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(tx)}
                          aria-label="수정"
                          className="h-7 w-7"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(tx.id)}
                          aria-label="삭제"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
