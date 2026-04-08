'use client';

import { useState, useEffect } from 'react';
import type { TradeType } from '@my-wallet/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type {
  Trade,
  StockAccount,
  Stock,
  CreateTradeDto,
  UpdateTradeDto,
} from '@/lib/api/stock';

interface TradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stocks: Stock[];
  accounts: StockAccount[];
  trade?: Trade | null;
  defaultStockId?: string;
  onSubmit: (dto: CreateTradeDto | UpdateTradeDto) => Promise<void>;
}

const TYPE_OPTIONS: TradeType[] = ['BUY', 'SELL'];
const TYPE_LABELS: Record<TradeType, string> = { BUY: '매수', SELL: '매도' };

const REASON_OPTIONS = [
  '가치 투자',
  '성장주',
  '배당',
  '모멘텀',
  '단기 트레이딩',
  '분할 매수',
  '목표가 달성',
  '손절',
  '포트폴리오 리밸런싱',
  '기타',
];

export function TradeForm({
  open,
  onOpenChange,
  stocks,
  accounts,
  trade,
  defaultStockId,
  onSubmit,
}: TradeFormProps) {
  const [stockId, setStockId] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<TradeType>('BUY');
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trade) {
      setStockId(trade.stockId);
      setAccountId(trade.accountId);
      setType(trade.type);
      setTradeDate(trade.tradeDate.slice(0, 10));
      setPrice(String(trade.price));
      setQuantity(String(trade.quantity));
      setReasons(trade.reason ?? []);
      setMemo(trade.memo ?? '');
    } else {
      setStockId(defaultStockId ?? '');
      setAccountId('');
      setType('BUY');
      setTradeDate(new Date().toISOString().slice(0, 10));
      setPrice('');
      setQuantity('');
      setReasons([]);
      setMemo('');
    }
    setStockSearch('');
    setError(null);
  }, [trade, open, defaultStockId]);

  const filteredStocks = stockSearch
    ? stocks.filter(
        (s) =>
          s.name.includes(stockSearch) || s.code.includes(stockSearch),
      )
    : stocks;

  const toggleReason = (reason: string) => {
    setReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockId) { setError('종목을 선택해주세요.'); return; }
    if (!accountId) { setError('계좌를 선택해주세요.'); return; }
    const priceNum = parseInt(price.replace(/,/g, ''), 10);
    if (isNaN(priceNum) || priceNum <= 0) { setError('유효한 단가를 입력해주세요.'); return; }
    const quantityNum = parseInt(quantity.replace(/,/g, ''), 10);
    if (isNaN(quantityNum) || quantityNum <= 0) { setError('유효한 수량을 입력해주세요.'); return; }
    if (!tradeDate) { setError('날짜를 선택해주세요.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      if (trade) {
        const dto: UpdateTradeDto = {
          tradeDate,
          price: priceNum,
          quantity: quantityNum,
          reason: reasons.length > 0 ? reasons : undefined,
          memo: memo.trim() || undefined,
        };
        await onSubmit(dto);
      } else {
        const dto: CreateTradeDto = {
          stockId,
          accountId,
          type,
          tradeDate,
          price: priceNum,
          quantity: quantityNum,
          reason: reasons.length > 0 ? reasons : undefined,
          memo: memo.trim() || undefined,
        };
        await onSubmit(dto);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trade ? '매매 수정' : '매매 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock */}
          {!trade && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">종목</label>
              <Input
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="종목명 또는 코드 검색"
                className="mb-1"
              />
              <Select value={stockId} onValueChange={setStockId}>
                <SelectTrigger>
                  <SelectValue placeholder="종목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStocks.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Account */}
          {!trade && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">계좌</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="계좌 선택" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.alias ?? `${a.broker}`} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type */}
          {!trade && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">유형</label>
              <Select value={type} onValueChange={(v) => setType(v as TradeType)}>
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Trade Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">거래일</label>
            <Input
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">단가 (원)</label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min={1}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">수량 (주)</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min={1}
            />
          </div>

          {/* Total preview */}
          {price && quantity && (
            <div className="text-sm text-muted-foreground">
              총금액:{' '}
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat('ko-KR').format(
                  (parseInt(price) || 0) * (parseInt(quantity) || 0),
                )}
                원
              </span>
            </div>
          )}

          {/* Reasons */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">매매 사유 (선택)</label>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => toggleReason(reason)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    reasons.includes(reason)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Memo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">메모 (선택)</label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : trade ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
