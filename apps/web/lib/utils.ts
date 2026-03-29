import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function formatAmountWithSign(amount: number): string {
  const sign = amount > 0 ? '+' : '';
  return sign + new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function formatPercent(rate: number | undefined | null): string {
  if (rate == null || isNaN(rate)) return '0.00%';
  const sign = rate > 0 ? '+' : '';
  return sign + rate.toFixed(2) + '%';
}

export function formatMonth(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}
