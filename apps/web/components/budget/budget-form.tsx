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

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  budget?: Budget | null;
  month: string; // YYYY-MM
  onSubmit: (dto: CreateBudgetDto | UpdateBudgetDto) => Promise<void>;
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
      setAmount(String(budget.amount));
    } else {
      setType('EXPENSE');
      setCategoryId('');
      setAmount('');
    }
    setError(null);
  }, [budget, open]);

  const filteredCategories = categories.filter((c) => c.type === type);

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
                      {c.name}
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
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={1}
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
