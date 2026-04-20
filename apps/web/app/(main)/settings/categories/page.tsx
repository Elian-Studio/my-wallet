'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCategoryTree } from '@/hooks/use-budget';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from '@/lib/api/budget';
import { CategoryEditorDialog, type CategoryEditorSubmit } from '@/components/settings/category-editor-dialog';
import type { TransactionType, CategoryNode } from '@my-wallet/shared';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  FolderTree,
} from 'lucide-react';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: Array<{ key: TransactionType; label: string }> = [
  { key: 'EXPENSE', label: '지출' },
  { key: 'SAVING', label: '저축' },
  { key: 'INCOME', label: '수입' },
];

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
  | { mode: 'closed' }
  | {
      mode: 'create-root';
      type: TransactionType;
    }
  | {
      mode: 'create-child';
      type: TransactionType;
      parent: CategoryNode;
    }
  | {
      mode: 'edit';
      node: CategoryNode;
    };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TransactionType>('EXPENSE');
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { tree, loading, error, refetch } = useCategoryTree(activeTab);

  const stats = useMemo(() => {
    let parents = 0;
    let leaves = 0;
    for (const root of tree) {
      if (root.children.length > 0) {
        parents += 1;
        leaves += root.children.length;
      } else {
        leaves += 1;
      }
    }
    return { parents, leaves, total: parents + leaves };
  }, [tree]);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSubmit = async (data: CategoryEditorSubmit) => {
    if (dialog.mode === 'closed') return;

    if (dialog.mode === 'create-root') {
      const dto: CreateCategoryDto = {
        name: data.name,
        type: dialog.type,
        parentId: null,
        sortOrder: data.sortOrder,
      };
      await createCategory(dto);
    } else if (dialog.mode === 'create-child') {
      const dto: CreateCategoryDto = {
        name: data.name,
        type: dialog.type,
        parentId: dialog.parent.id,
        sortOrder: data.sortOrder,
      };
      await createCategory(dto);
    } else if (dialog.mode === 'edit') {
      const dto: UpdateCategoryDto = {
        name: data.name,
        sortOrder: data.sortOrder,
      };
      if (data.parentId !== undefined) {
        dto.parentId = data.parentId;
      }
      await updateCategory(dialog.node.id, dto);
    }
    refetch();
  };

  const handleDelete = async (node: CategoryNode) => {
    const msg = node.children.length > 0
      ? `"${node.name}" 대분류 아래에 ${node.children.length}개의 소분류가 있습니다. 소분류를 먼저 정리해주세요.`
      : `"${node.name}" 카테고리를 삭제하시겠습니까? 연결된 거래가 있으면 비활성화됩니다.`;

    if (node.children.length > 0) {
      alert(msg);
      return;
    }
    if (!confirm(msg)) return;
    try {
      await deleteCategory(node.id);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          <h1 className="text-2xl font-bold">카테고리 관리</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-base">
                {TABS.find((t) => t.key === activeTab)?.label} 카테고리 트리
              </CardTitle>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-xs">
                  대분류 {stats.parents}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  소분류 {stats.leaves}
                </Badge>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialog({ mode: 'create-root', type: activeTab })}
              className="gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              대분류 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive text-sm">{error}</div>
          ) : tree.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              카테고리가 없습니다. "대분류 추가"로 시작해주세요.
            </div>
          ) : (
            <div className="divide-y">
              {tree.map((root) => {
                const hasChildren = root.children.length > 0;
                const isExpanded = !collapsed.has(root.id);
                return (
                  <div key={root.id}>
                    <RootRow
                      node={root}
                      hasChildren={hasChildren}
                      expanded={isExpanded}
                      onToggle={() => toggle(root.id)}
                      onEdit={() => setDialog({ mode: 'edit', node: root })}
                      onDelete={() => handleDelete(root)}
                      onAddChild={() =>
                        setDialog({ mode: 'create-child', type: activeTab, parent: root })
                      }
                    />
                    {hasChildren && isExpanded && (
                      <div className="bg-muted/20">
                        {root.children.map((child) => (
                          <LeafRow
                            key={child.id}
                            node={child}
                            onEdit={() => setDialog({ mode: 'edit', node: child })}
                            onDelete={() => handleDelete(child)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryEditorDialog
        open={dialog.mode !== 'closed'}
        onOpenChange={(next) => !next && setDialog({ mode: 'closed' })}
        mode={
          dialog.mode === 'create-root'
            ? 'create-root'
            : dialog.mode === 'create-child'
              ? 'create-child'
              : 'edit'
        }
        type={
          dialog.mode === 'edit'
            ? (dialog.node.type as TransactionType)
            : dialog.mode !== 'closed'
              ? dialog.type
              : activeTab
        }
        parentName={dialog.mode === 'create-child' ? dialog.parent.name : undefined}
        initialName={dialog.mode === 'edit' ? dialog.node.name : ''}
        initialSortOrder={dialog.mode === 'edit' ? dialog.node.sortOrder : 0}
        initialParentId={dialog.mode === 'edit' ? dialog.node.parentId : null}
        parentOptions={tree.map((root) => ({ id: root.id, name: root.name }))}
        hasChildren={dialog.mode === 'edit' ? dialog.node.children.length > 0 : false}
        editingId={dialog.mode === 'edit' ? dialog.node.id : undefined}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function RootRow({
  node,
  hasChildren,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: CategoryNode;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? '접기' : '펼치기'}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}
      <span className="font-medium">{node.name}</span>
      <span className="text-xs text-muted-foreground">#{node.sortOrder}</span>
      {hasChildren && (
        <Badge variant="secondary" className="text-xs">
          {node.children.length}개 소분류
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddChild}
          className="h-7 gap-1 text-xs"
          aria-label="소분류 추가"
        >
          <Plus className="h-3 w-3" />
          소분류
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="수정"
          className="h-7 w-7"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="삭제"
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function LeafRow({
  node,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pl-10 pr-4 py-2.5 border-t border-border/50">
      <span className="text-sm">{node.name}</span>
      <span className="text-xs text-muted-foreground">#{node.sortOrder}</span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="수정"
          className="h-7 w-7"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="삭제"
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
