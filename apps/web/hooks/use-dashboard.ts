'use client';

import { useState, useEffect } from 'react';
import { fetchTransactions, type Transaction } from '@/lib/api/budget';
import { fetchTrades, type Trade } from '@/lib/api/stock';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = 'INCOME' | 'EXPENSE' | 'SAVING' | 'BUY' | 'SELL';

export interface ActivityItem {
  id: string;
  date: string;
  type: ActivityType;
  description: string;
  amount: number;
  source: 'budget' | 'stock';
}

interface UseRecentActivityReturn {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
}

// ─── useRecentActivity ────────────────────────────────────────────────────────

export function useRecentActivity(limit = 10): UseRecentActivityReturn {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTransactions({ limit: 20, page: 1 }).catch(() => ({ data: [] as Transaction[], total: 0, page: 1, limit: 20 })),
      fetchTrades({ limit: 20, page: 1 }).catch(() => ({ data: [] as Trade[], total: 0, page: 1, limit: 20 })),
    ])
      .then(([txRes, tradeRes]) => {
        if (cancelled) return;

        const txItems: ActivityItem[] = txRes.data.map((tx) => ({
          id: `tx-${tx.id}`,
          date: tx.date,
          type: tx.type as ActivityType,
          description: tx.category?.name ? `${tx.category.name} · ${tx.title}` : tx.title,
          amount: tx.amount,
          source: 'budget',
        }));

        const tradeItems: ActivityItem[] = tradeRes.data.map((trade) => ({
          id: `trade-${trade.id}`,
          date: trade.tradeDate,
          type: trade.type as ActivityType,
          description: trade.stock?.name
            ? `${trade.stock.name} (${trade.stock.code})`
            : `주식 ${trade.type === 'BUY' ? '매수' : '매도'}`,
          amount: trade.totalAmount,
          source: 'stock',
        }));

        const merged = [...txItems, ...tradeItems]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);

        setActivities(merged);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? '최근 활동을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { activities, loading, error };
}
