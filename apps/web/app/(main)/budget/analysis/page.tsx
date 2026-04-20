'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MonthPicker } from '@/components/common/month-picker';
import { BudgetChart } from '@/components/budget/budget-chart';
import { BudgetForm } from '@/components/budget/budget-form';
import { BudgetAnalysisTree } from '@/components/budget/budget-analysis-tree';
import { BudgetCompletionMeter } from '@/components/budget/budget-completion-meter';
import { ApplyAllDialog } from '@/components/budget/apply-all-dialog';
import { useBudgets, useBudgetAnalysis, useCategories } from '@/hooks/use-budget';
import type {
  Budget,
  CreateBudgetDto,
  UpdateBudgetDto,
} from '@/lib/api/budget';
import type { TransactionType } from '@my-wallet/shared';
import { BarChart3, Plus, Settings2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: Array<{ key: TransactionType; label: string }> = [
  { key: 'EXPENSE', label: '지출' },
  { key: 'SAVING', label: '저축' },
  { key: 'INCOME', label: '수입' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetAnalysisPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState<TransactionType>('EXPENSE');

  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [prefilledCategoryId, setPrefilledCategoryId] = useState<string | null>(null);
  const [prefilledAmount, setPrefilledAmount] = useState<number>(0);
  const [applyAllOpen, setApplyAllOpen] = useState(false);

  const {
    budgets,
    loading: budgetsLoading,
    create,
    update,
    remove,
    refetch: refreshBudgets,
  } = useBudgets(year, month);
  const {
    analysis,
    loading: analysisLoading,
    refetch: refreshAnalysis,
  } = useBudgetAnalysis(year, month);
  const { categories } = useCategories();

  // 탭별 필터링된 분석 데이터
  const tabItems = useMemo(
    () => analysis.filter((item) => item.type === activeTab),
    [analysis, activeTab],
  );

  // 완료도 계산: 이 탭의 leaf 카테고리 기준
  const completion = useMemo(() => {
    const leaves = tabItems.filter((item) => !item.isParent);
    const completed = leaves.filter((item) => item.isBudgeted).length;
    return { completed, total: leaves.length };
  }, [tabItems]);

  const chartData = useMemo(
    () => tabItems.filter((i) => i.isBudgeted && !i.isParent),
    [tabItems],
  );

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAddBudget = () => {
    setEditingBudget(null);
    setPrefilledCategoryId(null);
    setPrefilledAmount(0);
    setBudgetFormOpen(true);
  };

  const handleInlineAdd = (categoryId: string, recommendation: number) => {
    setEditingBudget(null);
    setPrefilledCategoryId(categoryId);
    setPrefilledAmount(recommendation);
    setBudgetFormOpen(true);
  };

  const handleEditBudget = (categoryId: string) => {
    const target = budgets.find((b) => b.categoryId === categoryId);
    if (!target) return;
    setEditingBudget(target);
    setPrefilledCategoryId(null);
    setPrefilledAmount(0);
    setBudgetFormOpen(true);
  };

  const handleRemoveBudget = async (categoryId: string) => {
    const target = budgets.find((b) => b.categoryId === categoryId);
    if (!target) return;
    if (!confirm(`${target.category?.name ?? '해당 카테고리'} 예산을 삭제하시겠습니까?`))
      return;
    await remove(target.id);
    refreshAnalysis();
  };

  const handleBudgetSubmit = async (dto: CreateBudgetDto | UpdateBudgetDto) => {
    if (editingBudget) {
      await update(editingBudget.id, dto as UpdateBudgetDto);
    } else {
      await create(dto as CreateBudgetDto);
    }
    refreshAnalysis();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">예산 분석</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/categories"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            카테고리 관리
          </Link>
          <MonthPicker value={selectedDate} onChange={setSelectedDate} />
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

      {/* Completion Meter + Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" />
              예산 설정 현황
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setApplyAllOpen(true)}
                disabled={budgets.length === 0}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                올해 일괄 적용
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddBudget}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                예산 추가
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetCompletionMeter
            completed={completion.completed}
            total={completion.total}
            label={`${TABS.find((t) => t.key === activeTab)?.label} 카테고리 예산 설정`}
          />
        </CardContent>
      </Card>

      {/* Analysis Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상세 분석 (트리)</CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            대분류 예산은 하위 카테고리 실적 합계에 대한 상한 캡입니다. 자식 예산은 각각 독립적으로 집계됩니다.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {analysisLoading || budgetsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <BudgetAnalysisTree
              items={tabItems}
              onEditBudget={handleEditBudget}
              onAddBudget={handleInlineAdd}
              onRemoveBudget={handleRemoveBudget}
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            설정된 예산 vs 실적
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysisLoading ? (
            <div className="h-48 bg-muted animate-pulse rounded" />
          ) : (
            <BudgetChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Budget Form Dialog */}
      <BudgetForm
        open={budgetFormOpen}
        onOpenChange={setBudgetFormOpen}
        categories={categories}
        budget={editingBudget}
        month={monthStr}
        onSubmit={handleBudgetSubmit}
        prefilledCategoryId={prefilledCategoryId}
        prefilledAmount={prefilledAmount}
      />

      {/* Apply All Dialog */}
      <ApplyAllDialog
        open={applyAllOpen}
        onOpenChange={setApplyAllOpen}
        year={year}
        month={month}
        onComplete={() => {
          refreshBudgets();
          refreshAnalysis();
        }}
      />
    </div>
  );
}

