'use client';

import { useMemo, useState } from 'react';
import type { BudgetAnalysisItem } from '@my-wallet/shared';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { AmountDisplay } from '@/components/common/amount-display';
import { StatusBadge } from '@/components/common/status-badge';
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortKey = 'name' | 'budget' | 'actual' | 'rate';
export type SortDir = 'asc' | 'desc';

interface BudgetAnalysisTreeProps {
  items: BudgetAnalysisItem[];
  onEditBudget: (categoryId: string) => void;
  onAddBudget: (categoryId: string, recommendation: number) => void;
  onRemoveBudget: (categoryId: string) => void;
}

interface TreeNode {
  item: BudgetAnalysisItem;
  children: BudgetAnalysisItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTree(items: BudgetAnalysisItem[]): TreeNode[] {
  const byId = new Map<string, BudgetAnalysisItem>();
  for (const it of items) byId.set(it.categoryId, it);

  const roots: TreeNode[] = [];
  const childrenMap = new Map<string, BudgetAnalysisItem[]>();

  for (const it of items) {
    if (it.parentId) {
      const arr = childrenMap.get(it.parentId) ?? [];
      arr.push(it);
      childrenMap.set(it.parentId, arr);
    }
  }

  for (const it of items) {
    if (!it.parentId) {
      roots.push({
        item: it,
        children: childrenMap.get(it.categoryId) ?? [],
      });
    } else if (!byId.has(it.parentId)) {
      // 부모가 목록에 없으면(필터 아웃 등) 루트로 승격
      roots.push({ item: it, children: [] });
    }
  }

  return roots;
}

function compareItems(a: BudgetAnalysisItem, b: BudgetAnalysisItem, key: SortKey, dir: SortDir): number {
  const mult = dir === 'asc' ? 1 : -1;
  switch (key) {
    case 'name':
      return a.categoryName.localeCompare(b.categoryName, 'ko') * mult;
    case 'budget':
      return (a.budget - b.budget) * mult;
    case 'actual':
      return (a.actual - b.actual) * mult;
    case 'rate':
      return (a.achievementRate - b.achievementRate) * mult;
  }
}

function sortTree(tree: TreeNode[], key: SortKey, dir: SortDir): TreeNode[] {
  const sorted = [...tree].sort((na, nb) => compareItems(na.item, nb.item, key, dir));
  return sorted.map((node) => ({
    item: node.item,
    children: [...node.children].sort((a, b) => compareItems(a, b, key, dir)),
  }));
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  active,
  dir,
  align = 'left',
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align?: 'left' | 'right';
  onClick: () => void;
}) {
  const icon = !active ? (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  ) : dir === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors',
        align === 'right' ? 'ml-auto' : '',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {align === 'right' ? (
        <>
          {icon}
          {label}
        </>
      ) : (
        <>
          {label}
          {icon}
        </>
      )}
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  item,
  depth,
  isParent,
  expanded,
  onToggle,
  onEditBudget,
  onAddBudget,
  onRemoveBudget,
}: {
  item: BudgetAnalysisItem;
  depth: number;
  isParent: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onEditBudget: (id: string) => void;
  onAddBudget: (id: string, rec: number) => void;
  onRemoveBudget: (id: string) => void;
}) {
  const indent = depth * 20;
  const isUnset = !item.isBudgeted;

  return (
    <TableRow className={isUnset ? 'bg-muted/20' : ''}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
          {isParent ? (
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
          <span className={cn('text-sm', isUnset && 'text-muted-foreground')}>
            {item.categoryName}
          </span>
          {isParent && item.isBudgeted && (
            <span
              title="부모 예산은 하위 카테고리 합계의 상한 캡입니다. 자식 각각의 예산은 독립적으로 집계됩니다."
              className="inline-flex items-center"
              aria-label="부모 예산 안내"
            >
              <Info className="h-3 w-3 text-muted-foreground/60" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {isUnset ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <AmountDisplay amount={item.budget} />
        )}
      </TableCell>
      <TableCell className="text-right">
        <AmountDisplay amount={item.actual} />
      </TableCell>
      <TableCell className="text-right">
        {isUnset ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <AmountDisplay amount={item.difference} showSign />
        )}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {isUnset ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          `${item.achievementRate.toFixed(1)}%`
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          {isUnset ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onAddBudget(item.categoryId, item.recommendation)
              }
              className="h-7 gap-1 text-xs"
              aria-label={`${item.categoryName} 예산 설정`}
            >
              <Plus className="h-3 w-3" />
              설정
              {item.recommendation > 0 && (
                <span className="text-muted-foreground">
                  (추천{' '}
                  {new Intl.NumberFormat('ko-KR').format(item.recommendation)}
                  )
                </span>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditBudget(item.categoryId)}
                aria-label={`${item.categoryName} 예산 수정`}
                className="h-7 w-7"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveBudget(item.categoryId)}
                aria-label={`${item.categoryName} 예산 삭제`}
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BudgetAnalysisTree({
  items,
  onEditBudget,
  onAddBudget,
  onRemoveBudget,
}: BudgetAnalysisTreeProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(items), [items]);
  const sorted = useMemo(() => sortTree(tree, sortKey, sortDir), [tree, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        이 유형의 활성 카테고리가 없습니다. 설정 → 카테고리 관리에서 추가해주세요.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/3">
            <SortHeader
              label="카테고리"
              active={sortKey === 'name'}
              dir={sortDir}
              onClick={() => handleSort('name')}
            />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader
              label="예산"
              active={sortKey === 'budget'}
              dir={sortDir}
              align="right"
              onClick={() => handleSort('budget')}
            />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader
              label="실적"
              active={sortKey === 'actual'}
              dir={sortDir}
              align="right"
              onClick={() => handleSort('actual')}
            />
          </TableHead>
          <TableHead className="text-right">차이</TableHead>
          <TableHead className="text-right">
            <SortHeader
              label="달성률"
              active={sortKey === 'rate'}
              dir={sortDir}
              align="right"
              onClick={() => handleSort('rate')}
            />
          </TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="w-28"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.flatMap((node) => {
          const hasChildren = node.children.length > 0;
          const isExpanded = !collapsed.has(node.item.categoryId);
          const rows = [
            <Row
              key={node.item.categoryId}
              item={node.item}
              depth={0}
              isParent={hasChildren}
              expanded={isExpanded}
              onToggle={() => toggle(node.item.categoryId)}
              onEditBudget={onEditBudget}
              onAddBudget={onAddBudget}
              onRemoveBudget={onRemoveBudget}
            />,
          ];
          if (hasChildren && isExpanded) {
            for (const child of node.children) {
              rows.push(
                <Row
                  key={child.categoryId}
                  item={child}
                  depth={1}
                  isParent={false}
                  onEditBudget={onEditBudget}
                  onAddBudget={onAddBudget}
                  onRemoveBudget={onRemoveBudget}
                />,
              );
            }
          }
          return rows;
        })}
      </TableBody>
    </Table>
  );
}
