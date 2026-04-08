'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TransactionTable, TransactionSkeleton } from '@/components/budget/transaction-table';
import { TransactionForm } from '@/components/budget/transaction-form';
import { useTransactions, useCategories } from '@/hooks/use-budget';
import type { TransactionType } from '@my-wallet/shared';
import type { Transaction, TransactionFilters, CreateTransactionDto, UpdateTransactionDto } from '@/lib/api/budget';
import { Plus, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  ALL: '전체',
  INCOME: '수입',
  EXPENSE: '지출',
  SAVING: '저축',
};

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const filters: TransactionFilters = {
    page,
    limit: PAGE_SIZE,
    ...(typeFilter !== 'ALL' && { type: typeFilter as TransactionType }),
    ...(categoryFilter !== 'ALL' && { categoryId: categoryFilter }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data, loading, error, create, update, remove } = useTransactions(filters);
  const { categories } = useCategories();

  const transactions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleOpenAdd = () => {
    setEditingTx(null);
    setFormOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('거래를 삭제하시겠습니까?')) return;
    await remove(id);
  };

  const handleSubmit = async (dto: CreateTransactionDto | UpdateTransactionDto) => {
    if (editingTx) {
      await update(editingTx.id, dto as UpdateTransactionDto);
    } else {
      await create(dto as CreateTransactionDto);
    }
  };

  const filteredByType = typeFilter !== 'ALL'
    ? categories.filter((c) => c.type === (typeFilter as TransactionType))
    : categories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래 내역</h1>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Type filter */}
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCategoryFilter('ALL'); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                {filteredByType.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Start date */}
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              placeholder="시작일"
            />

            {/* End date */}
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              placeholder="종료일"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            거래 목록
            {data && (
              <span className="text-sm font-normal text-muted-foreground">
                (총 {data.total}건)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <TransactionSkeleton />
          ) : error ? (
            <div className="py-12 text-center text-destructive text-sm">{error}</div>
          ) : (
            <TransactionTable
              transactions={transactions}
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
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        transaction={editingTx}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
