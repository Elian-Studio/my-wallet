'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ArrowLeftRight, Plus, Search } from 'lucide-react';
import type { TradeType } from '@my-wallet/shared';
import { useTrades, useStocks, useStockAccounts } from '@/hooks/use-stock';
import { TradeTable } from '@/components/stock/trade-table';
import { TradeForm } from '@/components/stock/trade-form';
import type { Trade, CreateTradeDto, UpdateTradeDto } from '@/lib/api/stock';

const PAGE_SIZE = 20;

export default function StockTradesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Filters
  const [stockSearch, setStockSearch] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterType, setFilterType] = useState<TradeType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { stocks } = useStocks();
  const { accounts } = useStockAccounts();

  // Find stockId from search
  const matchedStock = stockSearch
    ? stocks.find(
        (s) =>
          s.name.includes(stockSearch) || s.code.includes(stockSearch),
      )
    : undefined;

  const { data, loading, error, create, update, remove } = useTrades({
    stockId: matchedStock?.id,
    accountId: filterAccountId || undefined,
    type: filterType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const trades = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleCreate = async (dto: CreateTradeDto | UpdateTradeDto) => {
    await create(dto as CreateTradeDto);
  };

  const handleUpdate = async (dto: CreateTradeDto | UpdateTradeDto) => {
    if (editingTrade) {
      await update(editingTrade.id, dto as UpdateTradeDto);
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 매매 내역을 삭제하시겠습니까?')) return;
    await remove(id);
  };

  const handleOpenCreate = () => {
    setEditingTrade(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingTrade(null);
  };

  const resetFilters = () => {
    setStockSearch('');
    setFilterAccountId('');
    setFilterType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">매매 내역</h1>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          매매 추가
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">종목 검색</label>
              <Input
                value={stockSearch}
                onChange={(e) => { setStockSearch(e.target.value); setPage(1); }}
                placeholder="종목명 또는 코드"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">계좌</label>
              <Select
                value={filterAccountId || '__all__'}
                onValueChange={(v) => {
                  setFilterAccountId(v === '__all__' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">전체</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.alias ?? a.broker}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">유형</label>
              <Select
                value={filterType || '__all__'}
                onValueChange={(v) => {
                  setFilterType(v === '__all__' ? '' : v as TradeType);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">전체</SelectItem>
                  <SelectItem value="BUY">매수</SelectItem>
                  <SelectItem value="SELL">매도</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">시작일</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">종료일</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={resetFilters} className="h-8 w-full">
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trade List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            매매 목록
            {total > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                (총 {total.toLocaleString('ko-KR')}건)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive text-sm">{error}</div>
          ) : (
            <TradeTable
              trades={trades}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* Trade Form Dialog */}
      <TradeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        stocks={stocks}
        accounts={accounts}
        trade={editingTrade}
        onSubmit={editingTrade ? handleUpdate : handleCreate}
      />
    </div>
  );
}
