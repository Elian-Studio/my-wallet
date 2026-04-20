import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  BudgetStatus,
  BudgetAnalysisItem,
  TransactionType,
} from '@my-wallet/shared';

const WARNING_THRESHOLD = 0.8;
const ACHIEVEMENT_100 = 1.0;
const RECOMMENDATION_LOOKBACK_MONTHS = 3;

type CategoryLite = {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  sortOrder: number;
};

@Injectable()
export class BudgetAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetAnalysisItem[]> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const monthDate = new Date(`${monthStr}-01`);
    const startDate = new Date(`${monthStr}-01`);
    const nextMonthDate = new Date(monthDate);
    nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
    nextMonthDate.setUTCDate(nextMonthDate.getUTCDate() - 1);
    const endDate = nextMonthDate;

    const [categoriesRaw, budgets, transactions] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { parentId: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.budget.findMany({
        where: { userId, month: monthDate },
        include: { category: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
      }),
    ]);

    const categories: CategoryLite[] = categoriesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as TransactionType,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
    }));

    if (categories.length === 0) return [];

    // leaf 실적 집계
    const leafActual = new Map<string, number>();
    for (const tx of transactions) {
      leafActual.set(tx.categoryId, (leafActual.get(tx.categoryId) ?? 0) + tx.amount);
    }

    // 부모 rollup 계산: 부모 actual = 자식 leaf actual 합 + 부모 자신의 leaf actual
    // (트랜잭션은 leaf에만 연결되는 원칙이지만, 마이그레이션 중간 상태 대비 안전하게 합산)
    const childrenByParent = new Map<string, string[]>();
    for (const cat of categories) {
      if (cat.parentId) {
        const arr = childrenByParent.get(cat.parentId) ?? [];
        arr.push(cat.id);
        childrenByParent.set(cat.parentId, arr);
      }
    }

    const effectiveActual = new Map<string, number>();
    for (const cat of categories) {
      const childIds = childrenByParent.get(cat.id) ?? [];
      let sum = leafActual.get(cat.id) ?? 0;
      for (const cid of childIds) {
        sum += leafActual.get(cid) ?? 0;
      }
      effectiveActual.set(cat.id, sum);
    }

    // 예산 인덱스
    const budgetByCategory = new Map<string, { id: string; amount: number; type: TransactionType }>();
    for (const b of budgets) {
      budgetByCategory.set(b.categoryId, {
        id: b.id,
        amount: b.amount,
        type: b.type as TransactionType,
      });
    }

    // 추천 예산: 직전 N개월 실적 평균 (leaf에만; 부모는 자식 합)
    const recommendations = await this.computeRecommendations(
      userId,
      year,
      month,
      categories,
      childrenByParent,
    );

    // 조립
    return categories.map((cat) => {
      const budget = budgetByCategory.get(cat.id);
      const actual = effectiveActual.get(cat.id) ?? 0;
      const isParent = (childrenByParent.get(cat.id) ?? []).length > 0;
      const isBudgeted = budget !== undefined;
      const budgetAmount = budget?.amount ?? 0;
      const difference = budgetAmount - actual;
      const achievementRate = this.computeAchievementRate(budgetAmount, actual);

      let status: BudgetStatus;
      if (!isBudgeted) {
        status = 'UNSET';
      } else if (cat.type === 'INCOME') {
        status = this.evaluateIncomeStatus(achievementRate);
      } else {
        status = this.evaluateExpenseStatus(achievementRate);
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        type: cat.type,
        parentId: cat.parentId,
        isParent,
        isBudgeted,
        budget: budgetAmount,
        actual,
        difference,
        achievementRate: Math.round(achievementRate * 10000) / 100,
        status,
        recommendation: recommendations.get(cat.id) ?? 0,
      };
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private computeAchievementRate(budget: number, actual: number): number {
    if (budget > 0) return actual / budget;
    return actual > 0 ? 1 : 0;
  }

  private evaluateExpenseStatus(achievementRate: number): BudgetStatus {
    if (achievementRate > ACHIEVEMENT_100) return 'OVER';
    if (achievementRate >= WARNING_THRESHOLD) return 'WARNING';
    return 'GOOD';
  }

  private evaluateIncomeStatus(achievementRate: number): BudgetStatus {
    if (achievementRate >= ACHIEVEMENT_100) return 'GOOD';
    if (achievementRate >= WARNING_THRESHOLD) return 'WARNING';
    return 'OVER';
  }

  private async computeRecommendations(
    userId: string,
    year: number,
    month: number,
    categories: CategoryLite[],
    childrenByParent: Map<string, string[]>,
  ): Promise<Map<string, number>> {
    const startMonth = new Date(year, month - 1 - RECOMMENDATION_LOOKBACK_MONTHS, 1);
    const endMonth = new Date(year, month - 1, 0); // 이번 달 이전 (0일 = 전달 마지막 날)

    const priorTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startMonth, lte: endMonth },
      },
    });

    const leafSum = new Map<string, number>();
    for (const tx of priorTransactions) {
      leafSum.set(tx.categoryId, (leafSum.get(tx.categoryId) ?? 0) + tx.amount);
    }

    const recommendations = new Map<string, number>();
    const monthsDivisor = Math.max(RECOMMENDATION_LOOKBACK_MONTHS, 1);

    for (const cat of categories) {
      const childIds = childrenByParent.get(cat.id) ?? [];
      let total = leafSum.get(cat.id) ?? 0;
      for (const cid of childIds) {
        total += leafSum.get(cid) ?? 0;
      }
      const avg = total / monthsDivisor;
      // 1000원 단위 반올림 (UX용)
      recommendations.set(cat.id, Math.round(avg / 1000) * 1000);
    }

    return recommendations;
  }
}
