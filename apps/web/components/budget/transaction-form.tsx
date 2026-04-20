'use client';

import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction, Category, CreateTransactionDto, UpdateTransactionDto } from '@/lib/api/budget';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  transaction?: Transaction | null;
  onSubmit: (dto: CreateTransactionDto | UpdateTransactionDto) => Promise<void>;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: '수입',
  EXPENSE: '지출',
  SAVING: '저축',
};

const TYPE_OPTIONS: TransactionType[] = ['INCOME', 'EXPENSE', 'SAVING'];

export function TransactionForm({
  open,
  onOpenChange,
  categories,
  transaction,
  onSubmit,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isFixed, setIsFixed] = useState(false);
  const [memo, setMemo] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setCategoryId(transaction.categoryId);
      setTitle(transaction.title);
      setAmount(transaction.amount.toLocaleString('ko-KR'));
      setDate(transaction.date.slice(0, 10));
      setIsFixed(transaction.isFixed);
      setMemo(transaction.memo ?? '');
    } else {
      setType('EXPENSE');
      setCategoryId('');
      setTitle('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setIsFixed(false);
      setMemo('');
    }
    setError(null);
  }, [transaction, open]);

  const filteredCategories = (() => {
    const cats = categories.filter((c) => c.type === type);
    const roots = cats.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const childrenByParent = new Map<string, typeof cats>();
    for (const c of cats) {
      if (c.parentId) {
        const arr = childrenByParent.get(c.parentId) ?? [];
        arr.push(c);
        childrenByParent.set(c.parentId, arr);
      }
    }
    const ordered: typeof cats = [];
    for (const r of roots) {
      ordered.push(r);
      const kids = (childrenByParent.get(r.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
      ordered.push(...kids);
    }
    // 고아 leaf는 끝에 추가
    for (const c of cats) {
      if (c.parentId && !cats.find((p) => p.id === c.parentId) && !ordered.find((o) => o.id === c.id)) {
        ordered.push(c);
      }
    }
    return ordered;
  })();

  const handleTypeChange = (val: string) => {
    setType(val as TransactionType);
    setCategoryId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) { setError('카테고리를 선택해주세요.'); return; }
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    const amountNum = parseInt(amount.replace(/,/g, ''), 10);
    if (isNaN(amountNum) || amountNum <= 0) { setError('유효한 금액을 입력해주세요.'); return; }
    if (!date) { setError('날짜를 선택해주세요.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const dto: CreateTransactionDto = {
        categoryId,
        type,
        title: title.trim(),
        amount: amountNum,
        date,
        isFixed,
        memo: memo.trim() || undefined,
      };
      await onSubmit(dto);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? '거래 수정' : '거래 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
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

          {/* Category */}
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

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="거래 제목"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">금액 (원)</label>
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

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">날짜</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date
                    ? format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyy년 M월 d일', { locale: ko })
                    : '날짜 선택'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? parse(date, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(day) => {
                    if (day) setDate(format(day, 'yyyy-MM-dd'));
                    setCalendarOpen(false);
                  }}
                  defaultMonth={date ? parse(date, 'yyyy-MM-dd', new Date()) : undefined}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* isFixed */}
          <div className="flex items-center gap-2">
            <input
              id="isFixed"
              type="checkbox"
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isFixed" className="text-sm font-medium cursor-pointer">
              고정 거래
            </label>
          </div>

          {/* Memo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">메모 (선택)</label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모"
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
              {submitting ? '저장 중...' : transaction ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
