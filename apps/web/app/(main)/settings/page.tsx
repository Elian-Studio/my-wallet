'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CreateCategoryDto,
} from '@/lib/api/budget';
import { getCategoryColor } from '@/lib/category-colors';
import type { TransactionType } from '@my-wallet/shared';
import { Settings, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: '수입',
  EXPENSE: '지출',
  SAVING: '저축',
};

const TYPE_TABS: TransactionType[] = ['EXPENSE', 'INCOME', 'SAVING'];

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TransactionType>('EXPENSE');

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TransactionType>('EXPENSE');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = categories.filter((c) => c.type === activeTab);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormType(activeTab);
    setFormError(null);
    setFormOpen(true);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormError(null);
    setFormOpen(true);
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;
    try {
      await deleteCategory(cat.id);
      await loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('카테고리 이름을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: formName.trim() });
      } else {
        const dto: CreateCategoryDto = {
          name: formName.trim(),
          type: formType,
          sortOrder: filtered.length,
        };
        await createCategory(dto);
      }
      await loadCategories();
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* 카테고리 관리 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            카테고리 관리
          </CardTitle>
          <Button size="sm" onClick={handleAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </CardHeader>
        <CardContent>
          {/* 유형 탭 */}
          <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg">
            {TYPE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* 카테고리 목록 */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {TYPE_LABELS[activeTab]} 카테고리가 없습니다.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((cat) => {
                const color = getCategoryColor(cat.name);
                return (
                  <div
                    key={cat.id}
                    className="group flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${color.bg} ${color.text}`}
                      >
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cat)}
                        className="h-7 w-7"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cat)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리 추가/수정 다이얼로그 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? '카테고리 수정' : '카테고리 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingCategory && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">유형</label>
                <Select value={formType} onValueChange={(v) => setFormType(v as TransactionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_TABS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">이름</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="카테고리 이름"
                autoFocus
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '저장 중...' : editingCategory ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
