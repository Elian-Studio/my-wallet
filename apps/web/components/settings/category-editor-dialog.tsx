'use client';

import { useState, useEffect } from 'react';
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
import type { TransactionType, CategoryNode } from '@my-wallet/shared';

export interface CategoryEditorSubmit {
  name: string;
  sortOrder: number;
  parentId?: string | null;
}

interface CategoryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create-root' | 'create-child' | 'edit';
  initialName?: string;
  initialSortOrder?: number;
  initialParentId?: string | null;
  type: TransactionType;
  parentName?: string; // 소분류 생성 시 표시용
  /** edit 모드에서 reparenting 대상 후보 목록 (type이 같은 활성 대분류만) */
  parentOptions?: Array<Pick<CategoryNode, 'id' | 'name'>>;
  /** edit 대상이 자식을 가진 대분류인지 — 참이면 parent 변경 차단 (2-depth 유지) */
  hasChildren?: boolean;
  /** edit 대상의 id — reparent 대상 목록에서 자기 자신 제외 */
  editingId?: string;
  onSubmit: (data: CategoryEditorSubmit) => Promise<void>;
}

const ROOT_SENTINEL = '__ROOT__';

export function CategoryEditorDialog({
  open,
  onOpenChange,
  mode,
  initialName = '',
  initialSortOrder = 0,
  initialParentId = null,
  type,
  parentName,
  parentOptions = [],
  hasChildren = false,
  editingId,
  onSubmit,
}: CategoryEditorDialogProps) {
  const [name, setName] = useState(initialName);
  const [sortOrder, setSortOrder] = useState(String(initialSortOrder));
  const [parentId, setParentId] = useState<string>(initialParentId ?? ROOT_SENTINEL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setSortOrder(String(initialSortOrder));
      setParentId(initialParentId ?? ROOT_SENTINEL);
      setError(null);
    }
  }, [open, initialName, initialSortOrder, initialParentId]);

  const showReparent = mode === 'edit' && !hasChildren;
  const availableParents = parentOptions.filter((p) => p.id !== editingId);

  const title =
    mode === 'create-root'
      ? `대분류 추가 (${typeLabel(type)})`
      : mode === 'create-child'
        ? `소분류 추가${parentName ? ` - ${parentName}` : ''}`
        : '카테고리 수정';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('카테고리 이름을 입력해주세요.');
      return;
    }
    const sortOrderNum = parseInt(sortOrder, 10);
    if (isNaN(sortOrderNum) || sortOrderNum < 0) {
      setError('정렬 순서는 0 이상의 정수여야 합니다.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CategoryEditorSubmit = { name: trimmed, sortOrder: sortOrderNum };
      if (showReparent) {
        payload.parentId = parentId === ROOT_SENTINEL ? null : parentId;
      }
      await onSubmit(payload);
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">카테고리 이름</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 식비"
              autoFocus
            />
          </div>

          {showReparent && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">상위 카테고리</label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="상위 카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_SENTINEL}>
                    <span className="font-medium">(대분류로 설정)</span>
                  </SelectItem>
                  {availableParents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>
                        <span className="text-muted-foreground">└ </span>
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                변경 시 해당 대분류 아래로 이동합니다. 거래 이력은 유지됩니다.
              </p>
            </div>
          )}

          {mode === 'edit' && hasChildren && (
            <p className="text-xs text-muted-foreground">
              하위 카테고리가 있는 대분류는 소분류로 변경할 수 없습니다. 하위를 먼저 정리해주세요.
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">정렬 순서</label>
            <Input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">숫자가 작을수록 먼저 표시됩니다.</p>
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
              {submitting ? '저장 중...' : mode === 'edit' ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function typeLabel(type: TransactionType): string {
  switch (type) {
    case 'INCOME':
      return '수입';
    case 'EXPENSE':
      return '지출';
    case 'SAVING':
      return '저축';
  }
}
