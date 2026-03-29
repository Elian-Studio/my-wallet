'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BudgetAnalysisItem } from '@my-wallet/shared';

interface BudgetChartProps {
  data: BudgetAnalysisItem[];
}

function formatKRW(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 1000)}천`;
  }
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function BudgetChart({ data }: BudgetChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.categoryName,
    예산: item.budget,
    실적: item.actual,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={formatKRW}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('ko-KR').format(value) + '원'
          }
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend />
        <Bar dataKey="예산" fill="#6366f1" radius={[3, 3, 0, 0]} />
        <Bar dataKey="실적" fill="#f97316" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
