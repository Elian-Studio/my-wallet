'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { MonthPicker } from '@/components/common/month-picker';
import { AmountDisplay } from '@/components/common/amount-display';
import { StatusBadge } from '@/components/common/status-badge';
import { BudgetChart } from '@/components/budget/budget-chart';
import { BudgetProgress } from '@/components/budget/budget-progress';
import { BudgetForm } from '@/components/budget/budget-form';
import { ApplyAllDialog } from '@/components/budget/apply-all-dialog';
import { useBudgets, useBudgetAnalysis, useCategories } from '@/hooks/use-budget';
import type { Budget, CreateBudgetDto, UpdateBudgetDto } from '@/lib/api/budget';
import type { TransactionType } from '@my-wallet/shared';
import { BarChart3, Plus, Pencil, Trash2, Settings2, Copy } from 'lucide-react';

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: '수입',
  EXPENSE: '지출',
  SAVING: '저축',
};

const TYPE_VARIANTS: Record<TransactionType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INCOME: 'default',
  EXPENSE: 'destructive',
  SAVING: 'secondary',
};

export default function BudgetAnalysisPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [applyAllOpen, setApplyAllOpen] = useState(false);

  const { budgets, loading: budgetsLoading, create, update, remove, refetch: refreshBudgets } = useBudgets(year, month);
  const { analysis, loading: analysisLoading, refetch: refreshAnalysis } = useBudgetAnalysis(year, month);
  const { categories } = useCategories();

  const handleAddBudget = () => {
    setEditingBudget(null);
    setBudgetFormOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetFormOpen(true);
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('예산을 삭제하시겠습니까?')) return;
    await remove(id);
  };

  const handleBudgetSubmit = async (dto: CreateBudgetDto | UpdateBudgetDto) => {
    if (editingBudget) {
      await update(editingBudget.id, dto as UpdateBudgetDto);
    } else {
      await create(dto as CreateBudgetDto);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">예산 분석</h1>
        <MonthPicker value={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" />
              예산 설정
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
              <Button size="sm" variant="outline" onClick={handleAddBudget} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                예산 추가
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {budgetsLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">불러오는 중...</div>
          ) : budgets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              설정된 예산이 없습니다. 예산을 추가해보세요.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카테고리</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">예산 금액</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">
                      {budget.category?.name ?? budget.categoryId}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANTS[budget.type]}>
                        {TYPE_LABELS[budget.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AmountDisplay amount={budget.amount} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBudget(budget)}
                          aria-label="수정"
                          className="h-7 w-7"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBudget(budget.id)}
                          aria-label="삭제"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Analysis Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            카테고리별 예산 vs 실적
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysisLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : (
            <BudgetChart data={analysis} />
          )}
        </CardContent>
      </Card>

      {/* Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상세 분석</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {analysisLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">불러오는 중...</div>
          ) : analysis.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              분석할 데이터가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">예산</TableHead>
                  <TableHead className="text-right">실적</TableHead>
                  <TableHead className="text-right">차이</TableHead>
                  <TableHead className="text-right">달성률</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.map((item) => (
                  <TableRow key={item.categoryId}>
                    <TableCell className="font-medium">{item.categoryName}</TableCell>
                    <TableCell className="text-right">
                      <AmountDisplay amount={item.budget} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AmountDisplay amount={item.actual} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AmountDisplay
                        amount={item.difference}
                        showSign
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {item.achievementRate.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Progress Bars */}
      {analysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">카테고리별 달성률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {analysis.map((item) => (
                <BudgetProgress key={item.categoryId} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Form Dialog */}
      <BudgetForm
        open={budgetFormOpen}
        onOpenChange={setBudgetFormOpen}
        categories={categories}
        budget={editingBudget}
        month={monthStr}
        onSubmit={handleBudgetSubmit}
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
