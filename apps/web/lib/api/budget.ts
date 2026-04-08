import { apiClient } from '@/lib/api-client';
import type {
  TransactionType,
  BudgetAnalysisItem,
  MonthSummary,
  PaginatedResponse,
} from '@my-wallet/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  categoryId: string;
  category?: Category;
  type: TransactionType;
  title: string;
  amount: number;
  date: string;
  isFixed: boolean;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  category?: Category;
  type: TransactionType;
  month: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionDto {
  categoryId: string;
  type: TransactionType;
  title: string;
  amount: number;
  date: string;
  isFixed?: boolean;
  memo?: string;
}

export interface UpdateTransactionDto {
  categoryId?: string;
  type?: TransactionType;
  title?: string;
  amount?: number;
  date?: string;
  isFixed?: boolean;
  memo?: string;
}

export interface CreateBudgetDto {
  categoryId: string;
  type: TransactionType;
  month: string;
  amount: number;
}

export interface UpdateBudgetDto {
  amount: number;
}

// ─── Transaction API ──────────────────────────────────────────────────────────

export function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<PaginatedResponse<Transaction>> {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return apiClient.get<PaginatedResponse<Transaction>>(
    `/transactions${query ? `?${query}` : ''}`,
  );
}

export function createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
  return apiClient.post<Transaction>('/transactions', dto);
}

export function updateTransaction(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
  return apiClient.put<Transaction>(`/transactions/${id}`, dto);
}

export function deleteTransaction(id: string): Promise<void> {
  return apiClient.delete<void>(`/transactions/${id}`);
}

// ─── Category API ─────────────────────────────────────────────────────────────

export function fetchCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/categories');
}

export function fetchExpenseCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/categories/expense');
}

export function fetchIncomeCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/categories/income');
}

export function fetchSavingCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/categories/saving');
}

// ─── Summary API ──────────────────────────────────────────────────────────────

export function fetchMonthlySummary(year: number, month: number): Promise<MonthSummary> {
  return apiClient.get<MonthSummary>(`/transactions/summary/${year}/${month}`);
}

// ─── Budget API ───────────────────────────────────────────────────────────────

export function fetchBudgets(year: number, month: number): Promise<Budget[]> {
  return apiClient.get<Budget[]>(`/budgets?year=${year}&month=${month}`);
}

export function createBudget(dto: CreateBudgetDto): Promise<Budget> {
  return apiClient.post<Budget>('/budgets', dto);
}

export function updateBudget(id: string, dto: UpdateBudgetDto): Promise<Budget> {
  return apiClient.put<Budget>(`/budgets/${id}`, dto);
}

export function deleteBudget(id: string): Promise<void> {
  return apiClient.delete<void>(`/budgets/${id}`);
}

export function fetchBudgetAnalysis(year: number, month: number): Promise<BudgetAnalysisItem[]> {
  return apiClient.get<BudgetAnalysisItem[]>(`/budgets/analysis?year=${year}&month=${month}`);
}

// ─── Apply-All API ────────────────────────────────────────────────────────────

export interface ApplyAllPreviewMonth {
  month: number;
  status: 'new' | 'conflict' | 'same';
  existing: Budget[];
}

export interface ApplyAllPreview {
  source: { year: number; month: number; budgets: Budget[] };
  months: ApplyAllPreviewMonth[];
}

export interface ApplyAllResult {
  created: number;
  updated: number;
  skipped: number;
}

export function previewApplyAll(
  sourceYear: number,
  sourceMonth: number,
  targetYear: number,
): Promise<ApplyAllPreview> {
  return apiClient.post<ApplyAllPreview>('/budgets/apply-all/preview', {
    sourceYear,
    sourceMonth,
    targetYear,
  });
}

export function applyAllBudgets(params: {
  sourceYear: number;
  sourceMonth: number;
  targetYear: number;
  selectedMonths: number[];
  conflictMode: 'skip' | 'overwrite';
}): Promise<ApplyAllResult> {
  return apiClient.post<ApplyAllResult>('/budgets/apply-all', params);
}
