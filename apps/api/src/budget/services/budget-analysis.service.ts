import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { BudgetStatus, BudgetAnalysisItem } from '@my-wallet/shared';

const WARNING_THRESHOLD = 0.8;
const ACHIEVEMENT_100 = 1.0;

@Injectable()
export class BudgetAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetAnalysisItem[]> {
    const monthDate = new Date(year, month - 1, 1);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month: monthDate },
      include: { category: true },
    });

    if (budgets.length === 0) {
      return [];
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const actualByCategory = new Map<string, number>();
    for (const tx of transactions) {
      const current = actualByCategory.get(tx.categoryId) ?? 0;
      actualByCategory.set(tx.categoryId, current + tx.amount);
    }

    return budgets.map((budget) => {
      const actual = actualByCategory.get(budget.categoryId) ?? 0;
      const difference = budget.amount - actual;
      const achievementRate =
        budget.amount > 0 ? actual / budget.amount : actual > 0 ? 1 : 0;

      let status: BudgetStatus;
      if (budget.type === 'INCOME') {
        status = this.evaluateIncomeStatus(achievementRate);
      } else {
        status = this.evaluateExpenseStatus(achievementRate);
      }

      return {
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        type: budget.type as BudgetAnalysisItem['type'],
        budget: budget.amount,
        actual,
        difference,
        achievementRate: Math.round(achievementRate * 10000) / 100,
        status,
      };
    });
  }

  private evaluateExpenseStatus(achievementRate: number): BudgetStatus {
    if (achievementRate > ACHIEVEMENT_100) {
      return 'OVER';
    }
    if (achievementRate >= WARNING_THRESHOLD) {
      return 'WARNING';
    }
    return 'GOOD';
  }

  private evaluateIncomeStatus(achievementRate: number): BudgetStatus {
    if (achievementRate >= ACHIEVEMENT_100) {
      return 'GOOD';
    }
    if (achievementRate >= WARNING_THRESHOLD) {
      return 'WARNING';
    }
    return 'OVER';
  }
}
