'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowLeft, Plus } from 'lucide-react';
import { useStockDetail, useHoldings, useTrades, useStockAccounts, useStocks } from '@/hooks/use-stock';
import { HoldingsTable } from '@/components/stock/holdings-table';
import { TradeTable } from '@/components/stock/trade-table';
import { TradeForm } from '@/components/stock/trade-form';
import { AmountDisplay } from '@/components/common/amount-display';
import type { Trade, CreateTradeDto, UpdateTradeDto } from '@/lib/api/stock';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StockDetailPageProps {
  params: Promise<{ stockId: string }>;
}

export default function StockDetailPage({ params }: StockDetailPageProps) {
  const { stockId } = use(params);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const { stock, loading: stockLoading } = useStockDetail(stockId);
  const { holdings } = useHoldings();
  const { data: tradesData, loading: tradesLoading, create, update, remove } = useTrades({
    stockId,
    limit: 50,
  });
  const { stocks } = useStocks();
  const { accounts } = useStockAccounts();

  const thisHolding = holdings.find((h) => h.stockId === stockId);
  const trades = tradesData?.data ?? [];

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 매매 내역을 삭제하시겠습니까?')) return;
    await remove(id);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingTrade(null);
  };

  const handleSubmit = async (dto: CreateTradeDto | UpdateTradeDto) => {
    if (editingTrade) {
      await update(editingTrade.id, dto as UpdateTradeDto);
    } else {
      await create(dto as CreateTradeDto);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stocks" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">종목 상세</h1>
      </div>

      {/* Stock Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            종목 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockLoading ? (
            <div className="text-muted-foreground text-sm">불러오는 중...</div>
          ) : stock ? (
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-bold">{stock.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{stock.code}</Badge>
                  {stock.market && (
                    <Badge variant="secondary">{stock.market}</Badge>
                  )}
                </div>
              </div>
              {thisHolding && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">현재가</div>
                  <AmountDisplay
                    amount={thisHolding.currentPrice}
                    className="text-lg font-semibold"
                  />
                  <div className={cn(
                    'text-sm tabular-nums',
                    thisHolding.unrealizedGainRate > 0 ? 'text-gain' :
                    thisHolding.unrealizedGainRate < 0 ? 'text-loss' : 'text-muted-foreground',
                  )}>
                    {formatPercent(thisHolding.unrealizedGainRate)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">종목 정보를 찾을 수 없습니다.</div>
          )}
        </CardContent>
      </Card>

      {/* Holdings for this stock */}
      {thisHolding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">보유 현황</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <HoldingsTable holdings={[thisHolding]} />
          </CardContent>
        </Card>
      )}

      {/* Trade History for this stock */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            매매 내역
            {trades.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({trades.length}건)
              </span>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingTrade(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            매매 추가
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {tradesLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : (
            <TradeTable
              trades={trades}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Trade Form Dialog */}
      <TradeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        stocks={stocks}
        accounts={accounts}
        trade={editingTrade}
        defaultStockId={stockId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
