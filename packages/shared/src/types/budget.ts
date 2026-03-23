export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING';

export type BudgetStatus = 'GOOD' | 'WARNING' | 'OVER';

export interface BudgetAnalysisItem {
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  budget: number;
  actual: number;
  difference: number;
  achievementRate: number;
  status: BudgetStatus;
}

export interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  balance: number;
}
