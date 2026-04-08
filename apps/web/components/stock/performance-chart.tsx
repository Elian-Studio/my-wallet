'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PerformanceItem } from '@my-wallet/shared';

interface PerformanceChartProps {
  data: PerformanceItem[];
}

function formatKRW(value: number): string {
  if (Math.abs(value) >= 10000000) {
    return `${(value / 10000000).toFixed(1)}천만`;
  }
  if (Math.abs(value) >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatMonth(month: string): string {
  // month format: "2024-01"
  const parts = month.split('-');
  if (parts.length === 2) {
    return `${parts[1]}월`;
  }
  return month;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        표시할 성과 데이터가 없습니다.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    실현손익: item.realizedGain,
    거래횟수: item.tradeCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={formatKRW}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === '실현손익') {
              return [new Intl.NumberFormat('ko-KR').format(value) + '원', name];
            }
            return [value + '회', name];
          }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar dataKey="실현손익" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.실현손익 >= 0 ? '#ef4444' : '#3b82f6'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
