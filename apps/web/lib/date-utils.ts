/**
 * 거래 내역을 날짜별로 그루핑하는 유틸리티
 */

export interface DateGroup<T> {
  date: string; // YYYY-MM-DD
  label: string; // "2026년 3월 27일"
  items: T[];
}

/**
 * 날짜 문자열(ISO)에서 YYYY-MM-DD 추출
 */
function toDateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/**
 * YYYY-MM-DD → "2026년 3월 27일" 형식
 */
function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/**
 * 날짜 필드를 가진 아이템 배열을 날짜별로 그루핑
 * 최신 날짜가 먼저 오도록 정렬
 */
export function groupByDate<T extends { date: string }>(items: T[]): DateGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = toDateKey(item.date);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      items,
    }));
}
