'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HoldingItem, PortfolioSummary, PerformanceItem } from '@my-wallet/shared';
import {
  fetchPortfolioSummary,
  fetchHoldings,
  fetchPerformance,
  fetchTrades,
  fetchStocks,
  fetchStockAccounts,
  fetchStock,
  fetchTradeRealizedGains,
  createTrade,
  updateTrade,
  deleteTrade,
  createStockAccount,
  type Trade,
  type Stock,
  type StockAccount,
  type TradeFilters,
  type CreateTradeDto,
  type UpdateTradeDto,
  type CreateStockAccountDto,
  type RealizedGain,
} from '@/lib/api/stock';
import type { PaginatedResponse } from '@my-wallet/shared';

// ─── usePortfolioSummary ──────────────────────────────────────────────────────

interface UsePortfolioSummaryReturn {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePortfolioSummary(accountId?: string): UsePortfolioSummaryReturn {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPortfolioSummary(accountId)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '포트폴리오 요약을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accountId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { summary, loading, error, refetch };
}

// ─── useHoldings ──────────────────────────────────────────────────────────────

interface UseHoldingsReturn {
  holdings: HoldingItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHoldings(accountId?: string): UseHoldingsReturn {
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHoldings(accountId)
      .then((res) => {
        if (!cancelled) setHoldings(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '보유 종목을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accountId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { holdings, loading, error, refetch };
}

// ─── usePerformance ───────────────────────────────────────────────────────────

interface UsePerformanceReturn {
  performance: PerformanceItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePerformance(year: number, accountId?: string): UsePerformanceReturn {
  const [performance, setPerformance] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPerformance(year, accountId)
      .then((res) => {
        if (!cancelled) setPerformance(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '성과 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, accountId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { performance, loading, error, refetch };
}

// ─── useTrades ────────────────────────────────────────────────────────────────

interface UseTradesReturn {
  data: PaginatedResponse<Trade> | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  create: (dto: CreateTradeDto) => Promise<void>;
  update: (id: string, dto: UpdateTradeDto) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useTrades(filters: TradeFilters = {}): UseTradesReturn {
  const [data, setData] = useState<PaginatedResponse<Trade> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTrades(filters)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '매매 내역을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const create = useCallback(
    async (dto: CreateTradeDto) => {
      await createTrade(dto);
      refetch();
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, dto: UpdateTradeDto) => {
      await updateTrade(id, dto);
      refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTrade(id);
      refetch();
    },
    [refetch],
  );

  return { data, loading, error, refetch, create, update, remove };
}

// ─── useStocks ────────────────────────────────────────────────────────────────

interface UseStocksReturn {
  stocks: Stock[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStocks(search?: string): UseStocksReturn {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStocks(search)
      .then((res) => {
        if (!cancelled) setStocks(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '종목 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [search, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { stocks, loading, error, refetch };
}

// ─── useStockAccounts ─────────────────────────────────────────────────────────

interface UseStockAccountsReturn {
  accounts: StockAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  create: (dto: CreateStockAccountDto) => Promise<void>;
}

export function useStockAccounts(): UseStockAccountsReturn {
  const [accounts, setAccounts] = useState<StockAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStockAccounts()
      .then((res) => {
        if (!cancelled) setAccounts(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '계좌 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const create = useCallback(
    async (dto: CreateStockAccountDto) => {
      await createStockAccount(dto);
      refetch();
    },
    [refetch],
  );

  return { accounts, loading, error, refetch, create };
}

// ─── useStockDetail ───────────────────────────────────────────────────────────

interface UseStockDetailReturn {
  stock: Stock | null;
  loading: boolean;
  error: string | null;
}

export function useStockDetail(stockId: string): UseStockDetailReturn {
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStock(stockId)
      .then((res) => {
        if (!cancelled) setStock(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '종목 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [stockId]);

  return { stock, loading, error };
}

// ─── useTradeRealizedGains ────────────────────────────────────────────────────

interface UseTradeRealizedGainsReturn {
  gains: RealizedGain[];
  loading: boolean;
  error: string | null;
}

export function useTradeRealizedGains(tradeId: string): UseTradeRealizedGainsReturn {
  const [gains, setGains] = useState<RealizedGain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTradeRealizedGains(tradeId)
      .then((res) => {
        if (!cancelled) setGains(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '실현 손익을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tradeId]);

  return { gains, loading, error };
}
