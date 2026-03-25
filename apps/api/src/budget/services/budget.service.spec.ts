import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { PrismaService } from '../../prisma/prisma.service';

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
          where: { userId, month: new Date(2026, 2, 1) },
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
});
