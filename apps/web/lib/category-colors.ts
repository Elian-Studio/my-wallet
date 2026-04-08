/**
 * 카테고리 이름 → Tailwind 색상 매핑
 * 도넛 차트, 카드형 리스트의 카테고리 뱃지에서 사용
 */

// 카테고리 이름 → [bg class, text class, hex (차트용)]
const CATEGORY_COLOR_MAP: Record<string, [bg: string, text: string, hex: string]> = {
  // EXPENSE (쓰자)
  식비: ['bg-blue-100', 'text-blue-700', '#3b82f6'],
  교통비: ['bg-green-100', 'text-green-700', '#22c55e'],
  통신비: ['bg-purple-100', 'text-purple-700', '#a855f7'],
  월세: ['bg-orange-100', 'text-orange-700', '#f97316'],
  생활비: ['bg-cyan-100', 'text-cyan-700', '#06b6d4'],
  경조비: ['bg-pink-100', 'text-pink-700', '#ec4899'],
  문화비: ['bg-indigo-100', 'text-indigo-700', '#6366f1'],
  공과금: ['bg-amber-100', 'text-amber-700', '#f59e0b'],
  '동생 기여금': ['bg-rose-100', 'text-rose-700', '#f43f5e'],
  // SAVING (모으자)
  보험: ['bg-emerald-100', 'text-emerald-700', '#10b981'],
  청약저축: ['bg-teal-100', 'text-teal-700', '#14b8a6'],
  연금저축: ['bg-sky-100', 'text-sky-700', '#0ea5e9'],
  투자: ['bg-violet-100', 'text-violet-700', '#8b5cf6'],
  // INCOME
  급여: ['bg-lime-100', 'text-lime-700', '#84cc16'],
  // fallback
  기타: ['bg-gray-100', 'text-gray-700', '#6b7280'],
};

const FALLBACK: [string, string, string] = ['bg-gray-100', 'text-gray-700', '#6b7280'];

export function getCategoryColor(name: string): { bg: string; text: string; hex: string } {
  const [bg, text, hex] = CATEGORY_COLOR_MAP[name] ?? FALLBACK;
  return { bg, text, hex };
}

export function getCategoryHex(name: string): string {
  return (CATEGORY_COLOR_MAP[name] ?? FALLBACK)[2];
}

/** 도넛 차트용: 카테고리 배열에 대한 색상 배열 반환 */
export function getCategoryColors(names: string[]): string[] {
  return names.map(getCategoryHex);
}
