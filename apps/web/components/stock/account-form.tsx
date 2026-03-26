'use client';

import { useState, useEffect } from 'react';
import type { AccountType } from '@my-wallet/shared';
import { ACCOUNT_TYPES, BROKERS } from '@my-wallet/shared';
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
import type { CreateStockAccountDto } from '@/lib/api/stock';

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateStockAccountDto) => Promise<void>;
}

const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPES) as [AccountType, string][];

export function AccountForm({ open, onOpenChange, onSubmit }: AccountFormProps) {
  const [type, setType] = useState<AccountType>('GENERAL');
  const [broker, setBroker] = useState('');
  const [alias, setAlias] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType('GENERAL');
      setBroker('');
      setAlias('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broker) { setError('증권사를 선택해주세요.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const dto: CreateStockAccountDto = {
        type,
        broker,
        alias: alias.trim() || undefined,
      };
      await onSubmit(dto);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '계좌 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>계좌 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">계좌 유형</label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue placeholder="계좌 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Broker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">증권사</label>
            <Select value={broker} onValueChange={setBroker}>
              <SelectTrigger>
                <SelectValue placeholder="증권사 선택" />
              </SelectTrigger>
              <SelectContent>
                {BROKERS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alias */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">계좌 별칭 (선택)</label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="예: 키움 ISA"
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
              {submitting ? '저장 중...' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
