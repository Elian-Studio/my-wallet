import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockTx = {
  budget: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockPrisma = {
  category: { findUnique: jest.fn() },
  budget: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto = {
      categoryId: 'cat-1',
      type: 'EXPENSE' as const,
      month: '2026-03-01',
      amount: 300000,
    };
    const mockCategory = { id: 'cat-1', name: '식비' };
    const mockBudget = {
      id: 'budget-1',
      userId,
      categoryId: 'cat-1',
      type: 'EXPENSE',
      month: new Date(2026, 2, 1),
      amount: 300000,
      category: mockCategory,
    };

    it('정상적으로 예산을 생성한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.budget.findUnique.mockResolvedValue(null);
      mockPrisma.budget.create.mockResolvedValue(mockBudget);

      const result = await service.create(userId, dto);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: dto.categoryId },
      });
      expect(mockPrisma.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            categoryId: dto.categoryId,
            type: dto.type,
            amount: dto.amount,
          }),
          include: { category: true },
        }),
      );
      expect(result).toEqual(mockBudget);
    });

    it('카테고리가 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.budget.create).not.toHaveBeenCalled();
    });

    it('동일 월에 동일 카테고리 예산이 이미 있으면 ConflictException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.budget.findUnique.mockResolvedValue(mockBudget);

      await expect(service.create(userId, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.budget.create).not.toHaveBeenCalled();
    });
  });

  describe('findByMonth', () => {
    const userId = 'user-1';

    it('해당 월의 예산 목록을 반환한다', async () => {
      const budgets = [
        { id: 'b1', categoryId: 'cat-1', amount: 300000, category: { name: '식비' } },
        { id: 'b2', categoryId: 'cat-2', amount: 100000, category: { name: '교통' } },
      ];
      mockPrisma.budget.findMany.mockResolvedValue(budgets);

      const result = await service.findByMonth(userId, 2026, 3);

      expect(mockPrisma.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, month: new Date('2026-03-01') },
          include: { category: true },
        }),
      );
      expect(result).toEqual(budgets);
    });

    it('해당 월에 예산이 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);

      const result = await service.findByMonth(userId, 2026, 3);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const userId = 'user-1';
    const id = 'budget-1';

    it('예산을 정상적으로 조회한다', async () => {
      const budget = { id, userId, amount: 300000, category: { name: '식비' } };
      mockPrisma.budget.findFirst.mockResolvedValue(budget);

      const result = await service.findOne(userId, id);

      expect(mockPrisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id, userId },
        include: { category: true },
      });
      expect(result).toEqual(budget);
    });

    it('예산이 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const userId = 'user-1';
    const id = 'budget-1';
    const dto = { amount: 500000 };

    it('예산 금액을 정상적으로 수정한다', async () => {
      const existingBudget = { id, userId, amount: 300000, category: { name: '식비' } };
      const updatedBudget = { ...existingBudget, amount: 500000 };
      mockPrisma.budget.findFirst.mockResolvedValue(existingBudget);
      mockPrisma.budget.update.mockResolvedValue(updatedBudget);

      const result = await service.update(userId, id, dto);

      expect(mockPrisma.budget.update).toHaveBeenCalledWith({
        where: { id },
        data: { amount: dto.amount },
        include: { category: true },
      });
      expect(result).toEqual(updatedBudget);
    });

    it('예산이 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(null);

      await expect(service.update(userId, id, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.budget.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const userId = 'user-1';
    const id = 'budget-1';

    it('예산을 정상적으로 삭제한다', async () => {
      const budget = { id, userId, amount: 300000, category: { name: '식비' } };
      mockPrisma.budget.findFirst.mockResolvedValue(budget);
      mockPrisma.budget.delete.mockResolvedValue(budget);

      const result = await service.remove(userId, id);

      expect(mockPrisma.budget.delete).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual({ deleted: true });
    });

    it('예산이 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, id)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.budget.delete).not.toHaveBeenCalled();
    });
  });

  describe('previewApplyAll', () => {
    const userId = 'user-1';
    const sourceBudgets = [
      { id: 'b1', categoryId: 'cat-1', amount: 300000, type: 'EXPENSE', category: { name: '식비' } },
      { id: 'b2', categoryId: 'cat-2', amount: 100000, type: 'EXPENSE', category: { name: '교통' } },
    ];

    it('원본 월에 예산이 2개 있고 대상 연도에 예산이 없으면 모든 달이 new 상태다', async () => {
      mockPrisma.budget.findMany
        .mockResolvedValueOnce(sourceBudgets) // source month fetch
        .mockResolvedValue([]); // all 12 months have no budgets

      const result = await service.previewApplyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
      });

      expect(result.source.budgets).toEqual(sourceBudgets);
      expect(result.months).toHaveLength(12);
      expect(result.months.every((m) => m.status === 'new')).toBe(true);
      expect(result.months.every((m) => m.existing.length === 0)).toBe(true);
    });

    it('일부 달에 금액이 다른 예산이 있으면 conflict 상태다', async () => {
      const differentBudgets = [
        { id: 'b3', categoryId: 'cat-1', amount: 999999, category: { name: '식비' } },
      ];

      // source fetch, then 12 month fetches: month 1 returns different budgets, rest empty
      mockPrisma.budget.findMany
        .mockResolvedValueOnce(sourceBudgets) // source
        .mockResolvedValueOnce(differentBudgets) // month 1 → conflict
        .mockResolvedValue([]); // months 2-12 → new

      const result = await service.previewApplyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
      });

      expect(result.months[0].status).toBe('conflict');
      expect(result.months[0].existing).toEqual(differentBudgets);
      expect(result.months.slice(1).every((m) => m.status === 'new')).toBe(true);
    });

    it('일부 달에 동일한 예산이 있으면 same 상태다', async () => {
      // month 1 has exact same budgets as source
      mockPrisma.budget.findMany
        .mockResolvedValueOnce(sourceBudgets) // source
        .mockResolvedValueOnce(sourceBudgets) // month 1 → same
        .mockResolvedValue([]); // months 2-12 → new

      const result = await service.previewApplyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
      });

      expect(result.months[0].status).toBe('same');
      expect(result.months.slice(1).every((m) => m.status === 'new')).toBe(true);
    });

    it('원본 월에 예산이 없으면 source.budgets가 비어있고 모든 달이 new 상태다', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);

      const result = await service.previewApplyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
      });

      expect(result.source.budgets).toEqual([]);
      expect(result.months.every((m) => m.status === 'new')).toBe(true);
    });
  });

  describe('applyAll', () => {
    const userId = 'user-1';
    const sourceBudgets = [
      { id: 'b1', categoryId: 'cat-1', amount: 300000, type: 'EXPENSE', category: { name: '식비' } },
      { id: 'b2', categoryId: 'cat-2', amount: 100000, type: 'EXPENSE', category: { name: '교통' } },
    ];

    beforeEach(() => {
      // Make $transaction execute the callback with mockTx
      mockPrisma.$transaction.mockImplementation(
        (cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx),
      );
      jest.clearAllMocks();
      mockPrisma.$transaction.mockImplementation(
        (cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx),
      );
    });

    it('선택한 달에 기존 예산이 없으면 모두 생성된다', async () => {
      mockPrisma.budget.findMany.mockResolvedValue(sourceBudgets);
      mockTx.budget.findUnique.mockResolvedValue(null);
      mockTx.budget.create.mockResolvedValue({});

      const result = await service.applyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
        selectedMonths: [1, 2],
        conflictMode: 'skip',
      });

      // 2 months × 2 budgets = 4 created
      expect(result).toEqual({ created: 4, updated: 0, skipped: 0 });
      expect(mockTx.budget.create).toHaveBeenCalledTimes(4);
    });

    it('conflictMode=overwrite이고 충돌이 있으면 기존 예산이 업데이트된다', async () => {
      const existingBudget = { id: 'existing-1', categoryId: 'cat-1', amount: 999999 };
      mockPrisma.budget.findMany.mockResolvedValue([sourceBudgets[0]]);
      mockTx.budget.findUnique.mockResolvedValue(existingBudget);
      mockTx.budget.update.mockResolvedValue({});

      const result = await service.applyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
        selectedMonths: [1],
        conflictMode: 'overwrite',
      });

      expect(result).toEqual({ created: 0, updated: 1, skipped: 0 });
      expect(mockTx.budget.update).toHaveBeenCalledWith({
        where: { id: existingBudget.id },
        data: { amount: sourceBudgets[0].amount },
      });
    });

    it('conflictMode=skip이고 충돌이 있으면 건너뛴다', async () => {
      const existingBudget = { id: 'existing-1', categoryId: 'cat-1', amount: 999999 };
      mockPrisma.budget.findMany.mockResolvedValue([sourceBudgets[0]]);
      mockTx.budget.findUnique.mockResolvedValue(existingBudget);

      const result = await service.applyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
        selectedMonths: [1],
        conflictMode: 'skip',
      });

      expect(result).toEqual({ created: 0, updated: 0, skipped: 1 });
      expect(mockTx.budget.create).not.toHaveBeenCalled();
      expect(mockTx.budget.update).not.toHaveBeenCalled();
    });

    it('일부는 새로 생성, 일부는 overwrite로 업데이트 → 정확한 카운트 반환', async () => {
      mockPrisma.budget.findMany.mockResolvedValue(sourceBudgets);
      // month 1: cat-1 exists (overwrite), cat-2 does not exist (create)
      mockTx.budget.findUnique
        .mockResolvedValueOnce({ id: 'existing-1', categoryId: 'cat-1', amount: 999999 }) // cat-1 exists
        .mockResolvedValueOnce(null); // cat-2 not exists
      mockTx.budget.update.mockResolvedValue({});
      mockTx.budget.create.mockResolvedValue({});

      const result = await service.applyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
        selectedMonths: [1],
        conflictMode: 'overwrite',
      });

      expect(result).toEqual({ created: 1, updated: 1, skipped: 0 });
    });

    it('prisma.$transaction을 사용하여 원자적으로 실행된다', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);

      await service.applyAll(userId, {
        sourceYear: 2026,
        sourceMonth: 3,
        targetYear: 2027,
        selectedMonths: [1],
        conflictMode: 'skip',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
