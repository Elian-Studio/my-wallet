import { Test, TestingModule } from '@nestjs/testing';
import { BudgetAnalysisService } from './budget-analysis.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  budget: { findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
};

function makeBudget(
  overrides: Partial<{
    id: string;
    categoryId: string;
    categoryName: string;
    type: 'INCOME' | 'EXPENSE' | 'SAVING';
    amount: number;
  }> = {},
) {
  const base = {
    id: 'b1',
    categoryId: 'cat-1',
    type: 'EXPENSE' as const,
    amount: 100000,
    category: { id: 'cat-1', name: '식비' },
    ...overrides,
  };
  if (overrides.categoryName) {
    base.category = { id: base.categoryId, name: overrides.categoryName };
  }
  return base;
}

function makeTx(categoryId: string, amount: number) {
  return { id: 'tx-1', categoryId, amount, date: new Date(2026, 2, 15) };
}

describe('BudgetAnalysisService', () => {
  let service: BudgetAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAnalysisService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BudgetAnalysisService>(BudgetAnalysisService);
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    const userId = 'user-1';
    const year = 2026;
    const month = 3;

    it('예산이 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);

      const result = await service.analyze(userId, year, month);

      expect(result).toEqual([]);
      expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
    });

    it('예산은 있지만 거래가 없으면 actual이 0이다', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 100000 })]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.analyze(userId, year, month);

      expect(result).toHaveLength(1);
      expect(result[0].actual).toBe(0);
      expect(result[0].difference).toBe(100000);
    });

    it('올바른 필드 구조를 반환한다', async () => {
      const budget = makeBudget({ categoryId: 'cat-1', categoryName: '식비', amount: 100000 });
      mockPrisma.budget.findMany.mockResolvedValue([budget]);
      mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 80000)]);

      const result = await service.analyze(userId, year, month);

      expect(result[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: '식비',
        type: 'EXPENSE',
        budget: 100000,
        actual: 80000,
        difference: 20000,
      });
    });

    describe('EXPENSE 상태 경계값', () => {
      it('달성률 80% 미만(79%)이면 GOOD이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 79000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('GOOD');
      });

      it('달성률이 정확히 80%이면 WARNING이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 80000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('WARNING');
      });

      it('달성률이 정확히 100%이면 WARNING이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 100000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('WARNING');
      });

      it('달성률이 100% 초과(101%)이면 OVER이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 101000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('OVER');
      });
    });

    describe('INCOME 상태 경계값', () => {
      it('달성률이 정확히 100% 이상이면 GOOD이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ type: 'INCOME', amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 100000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('GOOD');
      });

      it('달성률이 정확히 80%이면 WARNING이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ type: 'INCOME', amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 80000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('WARNING');
      });

      it('달성률이 80% 미만(79%)이면 OVER이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ type: 'INCOME', amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 79000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.status).toBe('OVER');
      });
    });

    describe('achievementRate', () => {
      it('소수점 2자리로 반올림한다', async () => {
        // 1/3 ≈ 33.33%
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 3 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 1)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.achievementRate).toBe(33.33);
      });

      it('예산이 0이고 실제도 0이면 achievementRate는 0이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 0 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.achievementRate).toBe(0);
      });

      it('예산이 0이고 실제가 있으면 achievementRate는 100이다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 0 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([makeTx('cat-1', 5000)]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.achievementRate).toBe(100);
      });
    });

    describe('복합 카테고리', () => {
      it('EXPENSE와 INCOME이 혼재할 때 각각 올바른 상태를 반환한다', async () => {
        const budgets = [
          makeBudget({ id: 'b1', categoryId: 'cat-1', categoryName: '식비', type: 'EXPENSE', amount: 100000 }),
          makeBudget({ id: 'b2', categoryId: 'cat-2', categoryName: '월급', type: 'INCOME', amount: 200000 }),
        ];
        budgets[1].category = { id: 'cat-2', name: '월급' };

        mockPrisma.budget.findMany.mockResolvedValue(budgets);
        mockPrisma.transaction.findMany.mockResolvedValue([
          makeTx('cat-1', 50000),   // EXPENSE: 50% → GOOD
          makeTx('cat-2', 200000),  // INCOME: 100% → GOOD
        ]);

        const result = await service.analyze(userId, year, month);

        expect(result).toHaveLength(2);
        const expenseItem = result.find((r) => r.categoryId === 'cat-1')!;
        const incomeItem = result.find((r) => r.categoryId === 'cat-2')!;
        expect(expenseItem.status).toBe('GOOD');
        expect(incomeItem.status).toBe('GOOD');
      });

      it('카테고리별 거래 합산이 올바르게 계산된다', async () => {
        mockPrisma.budget.findMany.mockResolvedValue([makeBudget({ amount: 100000 })]);
        mockPrisma.transaction.findMany.mockResolvedValue([
          makeTx('cat-1', 30000),
          makeTx('cat-1', 50000),
          makeTx('cat-other', 99999), // 다른 카테고리는 합산 제외
        ]);

        const [item] = await service.analyze(userId, year, month);

        expect(item.actual).toBe(80000);
        expect(item.status).toBe('WARNING');
      });
    });
  });
});
