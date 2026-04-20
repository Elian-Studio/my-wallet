export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING';

export type BudgetStatus = 'GOOD' | 'WARNING' | 'OVER' | 'UNSET';

export interface BudgetAnalysisItem {
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  parentId: string | null;
  isParent: boolean;
  isBudgeted: boolean;
  budget: number;
  actual: number;
  difference: number;
  achievementRate: number;
  status: BudgetStatus;
  recommendation: number;
}

export interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  balance: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: CategoryNode[];
}
