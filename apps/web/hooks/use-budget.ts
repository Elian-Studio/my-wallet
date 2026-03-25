'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BudgetAnalysisItem, MonthSummary } from '@my-wallet/shared';
import {
  fetchTransactions,
  fetchCategories,
  fetchMonthlySummary,
  fetchBudgets,
  fetchBudgetAnalysis,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createBudget,
  updateBudget,
  deleteBudget,
  type Transaction,
  type Category,
  type Budget,
  type TransactionFilters,
  type CreateTransactionDto,
  type UpdateTransactionDto,
  type CreateBudgetDto,
  type UpdateBudgetDto,
} from '@/lib/api/budget';
import type { PaginatedResponse } from '@my-wallet/shared';

// ─── useTransactions ──────────────────────────────────────────────────────────

interface UseTransactionsReturn {
  data: PaginatedResponse<Transaction> | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  create: (dto: CreateTransactionDto) => Promise<void>;
  update: (id: string, dto: UpdateTransactionDto) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useTransactions(filters: TransactionFilters = {}): UseTransactionsReturn {
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTransactions(filters)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const create = useCallback(
    async (dto: CreateTransactionDto) => {
      await createTransaction(dto);
      refetch();
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, dto: UpdateTransactionDto) => {
      await updateTransaction(id, dto);
      refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      refetch();
    },
    [refetch],
  );

  return { data, loading, error, refetch, create, update, remove };
}

// ─── useCategories ────────────────────────────────────────────────────────────

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((res) => {
        if (!cancelled) setCategories(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '카테고리를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading, error };
}

// ─── useMonthlySummary ────────────────────────────────────────────────────────

interface UseMonthlySummaryReturn {
  summary: MonthSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMonthlySummary(year: number, month: number): UseMonthlySummaryReturn {
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMonthlySummary(year, month)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '요약 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, month, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { summary, loading, error, refetch };
}

// ─── useBudgets ───────────────────────────────────────────────────────────────

interface UseBudgetsReturn {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  create: (dto: CreateBudgetDto) => Promise<void>;
  update: (id: string, dto: UpdateBudgetDto) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useBudgets(year: number, month: number): UseBudgetsReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBudgets(year, month)
      .then((res) => {
        if (!cancelled) setBudgets(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '예산 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, month, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const create = useCallback(
    async (dto: CreateBudgetDto) => {
      await createBudget(dto);
      refetch();
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, dto: UpdateBudgetDto) => {
      await updateBudget(id, dto);
      refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteBudget(id);
      refetch();
    },
    [refetch],
  );

  return { budgets, loading, error, refetch, create, update, remove };
}

// ─── useBudgetAnalysis ────────────────────────────────────────────────────────

interface UseBudgetAnalysisReturn {
  analysis: BudgetAnalysisItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBudgetAnalysis(year: number, month: number): UseBudgetAnalysisReturn {
  const [analysis, setAnalysis] = useState<BudgetAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBudgetAnalysis(year, month)
      .then((res) => {
        if (!cancelled) setAnalysis(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '분석 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, month, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { analysis, loading, error, refetch };
}
