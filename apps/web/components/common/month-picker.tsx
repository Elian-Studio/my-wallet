'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonth } from '@/lib/utils';

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const handlePrev = () => {
    const prev = new Date(value.getFullYear(), value.getMonth() - 1, 1);
    onChange(prev);
  };

  const handleNext = () => {
    const next = new Date(value.getFullYear(), value.getMonth() + 1, 1);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        aria-label="이전 월"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[120px] text-center text-sm font-medium">
        {formatMonth(value)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        aria-label="다음 월"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
