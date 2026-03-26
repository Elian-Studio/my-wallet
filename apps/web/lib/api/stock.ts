import { apiClient } from '@/lib/api-client';
import type {
  TradeType,
  AccountType,
  HoldingItem,
  PortfolioSummary,
  PerformanceItem,
} from '@my-wallet/shared';
import type { PaginatedResponse } from '@my-wallet/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Stock {
  id: string;
  code: string;
  name: string;
  market?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockPrice {
  stockId: string;
  price: number;
  updatedAt: string;
}

export interface StockAccount {
  id: string;
  type: AccountType;
  broker: string;
  alias?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  stockId: string;
  stock?: Stock;
  accountId: string;
  account?: StockAccount;
  type: TradeType;
  tradeDate: string;
  price: number;
  quantity: number;
  totalAmount: number;
  reason?: string[];
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealizedGain {
  tradeId: string;
  stockId: string;
  stockName: string;
  stockCode: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  gain: number;
  gainRate: number;
  tradeDate: string;
}

export interface TradeFilters {
  stockId?: string;
  accountId?: string;
  type?: TradeType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateTradeDto {
  stockId: string;
  accountId: string;
  type: TradeType;
  tradeDate: string;
  price: number;
  quantity: number;
  reason?: string[];
  memo?: string;
}

export interface UpdateTradeDto {
  tradeDate?: string;
  price?: number;
  quantity?: number;
  reason?: string[];
  memo?: string;
}

export interface CreateStockDto {
  code: string;
  name: string;
  market?: string;
}

export interface CreateStockAccountDto {
  type: AccountType;
  broker: string;
  alias?: string;
}

// ─── Trade API ────────────────────────────────────────────────────────────────

export function fetchTrades(filters: TradeFilters = {}): Promise<PaginatedResponse<Trade>> {
  const params = new URLSearchParams();
  if (filters.stockId) params.set('stockId', filters.stockId);
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.type) params.set('type', filters.type);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return apiClient.get<PaginatedResponse<Trade>>(`/trades${query ? `?${query}` : ''}`);
}

export function fetchTrade(id: string): Promise<Trade> {
  return apiClient.get<Trade>(`/trades/${id}`);
}

export function fetchTradeRealizedGains(id: string): Promise<RealizedGain[]> {
  return apiClient.get<RealizedGain[]>(`/trades/${id}/realized-gains`);
}

export function createTrade(dto: CreateTradeDto): Promise<Trade> {
  return apiClient.post<Trade>('/trades', dto);
}

export function updateTrade(id: string, dto: UpdateTradeDto): Promise<Trade> {
  return apiClient.put<Trade>(`/trades/${id}`, dto);
}

export function deleteTrade(id: string): Promise<void> {
  return apiClient.delete<void>(`/trades/${id}`);
}

// ─── Portfolio API ────────────────────────────────────────────────────────────

export function fetchPortfolioSummary(accountId?: string): Promise<PortfolioSummary> {
  const query = accountId ? `?accountId=${accountId}` : '';
  return apiClient.get<PortfolioSummary>(`/portfolio/summary${query}`);
}

export function fetchHoldings(accountId?: string): Promise<HoldingItem[]> {
  const query = accountId ? `?accountId=${accountId}` : '';
  return apiClient.get<HoldingItem[]>(`/portfolio/holdings${query}`);
}

export function fetchPerformance(year: number, accountId?: string): Promise<PerformanceItem[]> {
  const params = new URLSearchParams({ year: String(year) });
  if (accountId) params.set('accountId', accountId);
  return apiClient.get<PerformanceItem[]>(`/portfolio/performance?${params.toString()}`);
}

// ─── Stock API ────────────────────────────────────────────────────────────────

export function fetchStocks(search?: string): Promise<Stock[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiClient.get<Stock[]>(`/stocks${query}`);
}

export function fetchStock(id: string): Promise<Stock> {
  return apiClient.get<Stock>(`/stocks/${id}`);
}

export function fetchStockPrice(id: string): Promise<StockPrice> {
  return apiClient.get<StockPrice>(`/stocks/${id}/price`);
}

export function createStock(dto: CreateStockDto): Promise<Stock> {
  return apiClient.post<Stock>('/stocks', dto);
}

// ─── Stock Account API ────────────────────────────────────────────────────────

export function fetchStockAccounts(): Promise<StockAccount[]> {
  return apiClient.get<StockAccount[]>('/stock-accounts');
}

export function createStockAccount(dto: CreateStockAccountDto): Promise<StockAccount> {
  return apiClient.post<StockAccount>('/stock-accounts', dto);
}
