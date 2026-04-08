'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AmountDisplay } from '@/components/common/amount-display';
import {
  previewApplyAll,
  applyAllBudgets,
  type ApplyAllPreview,
  type ApplyAllPreviewMonth,
} from '@/lib/api/budget';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplyAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  onComplete: () => void;
}

type ConflictMode = 'skip' | 'overwrite';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

function StatusBadgeLocal({ status }: { status: 'new' | 'conflict' | 'same' }) {
  if (status === 'new') {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs px-1.5 py-0">
        새로 생성
      </Badge>
    );
  }
  if (status === 'conflict') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs px-1.5 py-0">
        변경됨
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 text-xs px-1.5 py-0">
      동일
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyAllDialog({
  open,
  onOpenChange,
  year,
  month,
  onComplete,
}: ApplyAllDialogProps) {
  const [preview, setPreview] = useState<ApplyAllPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [conflictMode, setConflictMode] = useState<ConflictMode>('skip');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const targetYear = year;

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const data = await previewApplyAll(year, month, targetYear);
      setPreview(data);
      // Pre-select 'new' and 'conflict' months, exclude source month
      const preSelected = new Set(
        data.months
          .filter((m) => m.month !== month && (m.status === 'new' || m.status === 'conflict'))
          .map((m) => m.month),
      );
      setSelectedMonths(preSelected);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : '미리보기를 불러오지 못했습니다.');
    } finally {
      setLoadingPreview(false);
    }
  }, [year, month, targetYear]);

  useEffect(() => {
    if (open) {
      setConflictMode('skip');
      setSubmitError(null);
      loadPreview();
    }
  }, [open, loadPreview]);

  const toggleMonth = (m: number) => {
    if (m === month) return; // source month is disabled
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!preview) return;
    const all = new Set(
      preview.months.filter((m) => m.month !== month).map((m) => m.month),
    );
    setSelectedMonths(all);
  };

  const handleDeselectAll = () => {
    setSelectedMonths(new Set());
  };

  const handleApply = async () => {
    if (!preview || selectedMonths.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await applyAllBudgets({
        sourceYear: year,
        sourceMonth: month,
        targetYear,
        selectedMonths: Array.from(selectedMonths),
        conflictMode,
      });
      onOpenChange(false);
      onComplete();
      // Show a brief summary — using alert for now since there's no toast component
      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created}개 생성`);
      if (result.updated > 0) parts.push(`${result.updated}개 덮어쓰기`);
      if (result.skipped > 0) parts.push(`${result.skipped}개 건너뜀`);
      if (parts.length > 0) {
        alert(`일괄 적용 완료: ${parts.join(', ')}`);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '적용에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived summary ──────────────────────────────────────────────────────

  const summary = (() => {
    if (!preview) return null;
    let willCreate = 0;
    let willUpdate = 0;
    let willSkip = 0;

    for (const m of preview.months) {
      if (!selectedMonths.has(m.month)) continue;
      if (m.status === 'new') {
        willCreate++;
      } else if (m.status === 'conflict') {
        if (conflictMode === 'overwrite') willUpdate++;
        else willSkip++;
      } else {
        // same
        willSkip++;
      }
    }
    return { willCreate, willUpdate, willSkip };
  })();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {year}년 {month}월 예산 일괄 적용
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            {year}년 {month}월의 예산 설정을 올해 다른 달에 복사합니다.
          </p>
        </DialogHeader>

        {loadingPreview && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            미리보기 불러오는 중...
          </div>
        )}

        {previewError && (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{previewError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadPreview}>
              다시 시도
            </Button>
          </div>
        )}

        {preview && !loadingPreview && (
          <div className="space-y-4">
            {/* Source summary */}
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <span className="font-medium">원본:</span>{' '}
              {year}년 {month}월 —{' '}
              <span className="text-muted-foreground">
                {preview.source.budgets.length}개 예산 항목
              </span>
            </div>

            {/* Month selection header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">적용할 월 선택</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={handleSelectAll}
                >
                  전체 선택
                </button>
                <span className="text-xs text-muted-foreground">·</span>
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={handleDeselectAll}
                >
                  전체 해제
                </button>
              </div>
            </div>

            {/* Month grid — 3 columns x 4 rows */}
            <div className="grid grid-cols-3 gap-2">
              {preview.months.map((monthData: ApplyAllPreviewMonth) => {
                const isSource = monthData.month === month;
                const isSelected = selectedMonths.has(monthData.month);
                return (
                  <MonthCard
                    key={monthData.month}
                    monthData={monthData}
                    isSource={isSource}
                    isSelected={isSelected}
                    onToggle={toggleMonth}
                  />
                );
              })}
            </div>

            {/* Conflict mode */}
            <div className="space-y-2">
              <p className="text-sm font-medium">충돌 처리 방식</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConflictMode('skip')}
                  className={[
                    'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                    conflictMode === 'skip'
                      ? 'border-primary bg-primary/5 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                  ].join(' ')}
                >
                  기존 유지 (건너뛰기)
                </button>
                <button
                  type="button"
                  onClick={() => setConflictMode('overwrite')}
                  className={[
                    'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                    conflictMode === 'overwrite'
                      ? 'border-primary bg-primary/5 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                  ].join(' ')}
                >
                  덮어쓰기
                </button>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium">적용 예상 결과</p>
                <p className="text-muted-foreground">
                  {selectedMonths.size}개 월 선택됨 —{' '}
                  {summary.willCreate > 0 && (
                    <span className="text-green-600">{summary.willCreate}개 생성 </span>
                  )}
                  {summary.willUpdate > 0 && (
                    <span className="text-amber-600">{summary.willUpdate}개 덮어쓰기 </span>
                  )}
                  {summary.willSkip > 0 && (
                    <span className="text-gray-500">{summary.willSkip}개 건너뜀</span>
                  )}
                </p>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={submitting || loadingPreview || !preview || selectedMonths.size === 0}
          >
            {submitting ? '적용 중...' : `${selectedMonths.size}개 월에 적용`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MonthCard ────────────────────────────────────────────────────────────────

interface MonthCardProps {
  monthData: ApplyAllPreviewMonth;
  isSource: boolean;
  isSelected: boolean;
  onToggle: (month: number) => void;
}

function MonthCard({ monthData, isSource, isSelected, onToggle }: MonthCardProps) {
  const disabled = isSource;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(monthData.month)}
      className={[
        'relative rounded-md border p-3 text-left text-sm transition-colors',
        disabled
          ? 'cursor-not-allowed bg-muted/50 border-border opacity-60'
          : isSelected
            ? 'border-primary bg-primary/5 cursor-pointer'
            : 'border-border bg-background hover:border-primary/40 cursor-pointer',
      ].join(' ')}
    >
      {/* Checkbox indicator */}
      {!disabled && (
        <span
          className={[
            'absolute right-2 top-2 h-4 w-4 rounded border flex items-center justify-center text-xs',
            isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border',
          ].join(' ')}
        >
          {isSelected && '✓'}
        </span>
      )}

      <p className="font-medium">{MONTH_NAMES[monthData.month - 1]}</p>

      <div className="mt-1.5">
        <StatusBadgeLocal status={isSource ? 'same' : monthData.status} />
      </div>

      {isSource && (
        <p className="mt-1 text-xs text-muted-foreground">원본</p>
      )}

      {/* Conflict detail: show existing total */}
      {!isSource && monthData.status === 'conflict' && monthData.existing.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          기존{' '}
          <AmountDisplay
            amount={monthData.existing.reduce((sum, b) => sum + b.amount, 0)}
            className="text-xs"
          />
        </p>
      )}

      {!isSource && monthData.status === 'new' && (
        <p className="mt-1 text-xs text-muted-foreground">예산 없음</p>
      )}
    </button>
  );
}
