'use client';

import { useState, useEffect } from 'react';
import type { TransactionType } from '@my-wallet/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { Budget, Category, CreateBudgetDto, UpdateBudgetDto } from '@/lib/api/budget';

// 카테고리를 부모 → 자식 순서로 정렬 (parent 먼저, 그 다음 그 parent의 children)
function orderCategoriesForDisplay(cats: Category[]): Category[] {
  const roots = cats.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of cats) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    }
  }
  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const ordered: Category[] = [];
  for (const r of roots) {
    ordered.push(r);
    const kids = childrenByParent.get(r.id) ?? [];
    ordered.push(...kids);
  }
  // 부모가 목록에 없는 고아 자식들 처리
  for (const c of cats) {
    if (c.parentId && !cats.find((p) => p.id === c.parentId)) {
      if (!ordered.find((o) => o.id === c.id)) ordered.push(c);
    }
  }
  return ordered;
}

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  budget?: Budget | null;
  month: string; // YYYY-MM
  onSubmit: (dto: CreateBudgetDto | UpdateBudgetDto) => Promise<void>;
  /** 새 예산 추가 시 미리 선택될 카테고리 ID (inline +설정 버튼 용) */
  prefilledCategoryId?: string | null;
  /** 새 예산 추가 시 미리 입력될 금액 (추천 금액) */
  prefilledAmount?: number;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: '수입',
  EXPENSE: '지출',
  SAVING: '저축',
};

const TYPE_OPTIONS: TransactionType[] = ['INCOME', 'EXPENSE', 'SAVING'];

export function BudgetForm({
  open,
  onOpenChange,
  categories,
  budget,
  month,
  onSubmit,
  prefilledCategoryId,
  prefilledAmount,
}: BudgetFormProps) {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setType(budget.type);
      setCategoryId(budget.categoryId);
      setAmount(budget.amount.toLocaleString('ko-KR'));
    } else if (prefilledCategoryId) {
      const prefilled = categories.find((c) => c.id === prefilledCategoryId);
      setType(prefilled?.type ?? 'EXPENSE');
      setCategoryId(prefilledCategoryId);
      setAmount(
        prefilledAmount && prefilledAmount > 0
          ? prefilledAmount.toLocaleString('ko-KR')
          : '',
      );
    } else {
      setType('EXPENSE');
      setCategoryId('');
      setAmount('');
    }
    setError(null);
  }, [budget, open, prefilledCategoryId, prefilledAmount, categories]);

  const filteredCategories = orderCategoriesForDisplay(
    categories.filter((c) => c.type === type),
  );

  const handleTypeChange = (val: string) => {
    setType(val as TransactionType);
    setCategoryId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(amount.replace(/,/g, ''), 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('유효한 금액을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (budget) {
        // Update — only amount changes
        const dto: UpdateBudgetDto = { amount: amountNum };
        await onSubmit(dto);
      } else {
        if (!categoryId) { setError('카테고리를 선택해주세요.'); setSubmitting(false); return; }
        const dto: CreateBudgetDto = {
          categoryId,
          type,
          month,
          amount: amountNum,
        };
        await onSubmit(dto);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{budget ? '예산 수정' : '예산 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type — only for create */}
          {!budget && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">유형</label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category — only for create */}
          {!budget && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">카테고리</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parentId ? (
                        <span>
                          <span className="text-muted-foreground">└ </span>
                          {c.name}
                        </span>
                      ) : (
                        <span className="font-medium">{c.name}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show category name when editing */}
          {budget && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">카테고리</label>
              <p className="text-sm py-2 px-3 rounded-md border border-input bg-muted/30">
                {budget.category?.name ?? budget.categoryId}
              </p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">예산 금액 (원)</label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw === '') { setAmount(''); return; }
                setAmount(Number(raw).toLocaleString('ko-KR'));
              }}
              placeholder="0"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : budget ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
