import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { QueryTransactionDto } from '../dto/query-transaction.dto';

const USER_ID = 'user-001';
const TX_ID = 'tx-001';
const CAT_ID = 'cat-001';

const mockCategory = {
  id: CAT_ID,
  name: '식비',
  type: 'EXPENSE',
  sortOrder: 1,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockTransaction = {
  id: TX_ID,
  userId: USER_ID,
  categoryId: CAT_ID,
  type: 'EXPENSE' as const,
  title: '점심식사',
  amount: 12000,
  date: new Date('2026-03-15'),
  isFixed: false,
  memo: null,
  createdAt: new Date('2026-03-15'),
  updatedAt: new Date('2026-03-15'),
  category: mockCategory,
};

const mockPrisma = {
  category: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  describe('create - 거래 내역 생성', () => {
    const dto: CreateTransactionDto = {
      categoryId: CAT_ID,
      type: 'EXPENSE',
      title: '점심식사',
      amount: 12000,
      date: '2026-03-15',
    };

    it('유효한 카테고리로 거래를 생성한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.create(USER_ID, dto);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: CAT_ID },
      });
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          categoryId: dto.categoryId,
          type: dto.type,
          title: dto.title,
          amount: dto.amount,
          date: new Date(dto.date),
          isFixed: false,
          memo: undefined,
        },
        include: { category: true },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('isFixed 기본값은 false이다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

      await service.create(USER_ID, { ...dto, isFixed: undefined });

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isFixed: false }),
        }),
      );
    });

    it('isFixed가 true이면 true로 저장된다', async () => {
      const fixedTx = { ...mockTransaction, isFixed: true };
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.transaction.create.mockResolvedValue(fixedTx);

      const result = await service.create(USER_ID, { ...dto, isFixed: true });

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isFixed: true }),
        }),
      );
      expect(result.isFixed).toBe(true);
    });

    it('존재하지 않는 카테고리이면 NotFoundException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(
        new NotFoundException('카테고리를 찾을 수 없습니다.'),
      );
      expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll - 거래 목록 조회', () => {
    const buildQuery = (overrides: Partial<QueryTransactionDto> = {}): QueryTransactionDto => {
      const q = new QueryTransactionDto();
      return Object.assign(q, overrides);
    };

    it('필터 없이 전체 목록을 페이지네이션으로 반환한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const query = buildQuery();
      const result = await service.findAll(USER_ID, query);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          include: { category: true },
          orderBy: { date: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual({
        data: [mockTransaction],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('type 필터를 적용한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const query = buildQuery({ type: 'EXPENSE' });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, type: 'EXPENSE' },
        }),
      );
    });

    it('categoryId 필터를 적용한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const query = buildQuery({ categoryId: CAT_ID });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, categoryId: CAT_ID },
        }),
      );
    });

    it('startDate와 endDate 필터를 적용한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const query = buildQuery({ startDate: '2026-03-01', endDate: '2026-03-31' });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            date: {
              gte: new Date('2026-03-01'),
              lte: new Date('2026-03-31'),
            },
          },
        }),
      );
    });

    it('startDate만 있을 때 gte만 적용된다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const query = buildQuery({ startDate: '2026-03-01' });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            date: { gte: new Date('2026-03-01') },
          },
        }),
      );
    });

    it('결과가 없으면 빈 배열과 total 0을 반환한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const query = buildQuery();
      const result = await service.findAll(USER_ID, query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('2페이지 요청 시 skip이 limit만큼 증가한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(25);

      const query = buildQuery({ page: 2, limit: 10 });
      const result = await service.findAll(USER_ID, query);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOne - 단일 거래 조회', () => {
    it('존재하는 거래를 반환한다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);

      const result = await service.findOne(USER_ID, TX_ID);

      expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: TX_ID, userId: USER_ID },
        include: { category: true },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('존재하지 않는 거래이면 NotFoundException을 던진다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, 'non-existent')).rejects.toThrow(
        new NotFoundException('거래 내역을 찾을 수 없습니다.'),
      );
    });

    it('다른 사용자의 거래는 조회되지 않는다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-user', TX_ID)).rejects.toThrow(NotFoundException);

      expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TX_ID, userId: 'other-user' } }),
      );
    });
  });

  describe('update - 거래 수정', () => {
    const dto: UpdateTransactionDto = { title: '저녁식사', amount: 20000 };

    it('유효한 데이터로 거래를 수정한다', async () => {
      const updatedTx = { ...mockTransaction, title: '저녁식사', amount: 20000 };
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.update.mockResolvedValue(updatedTx);

      const result = await service.update(USER_ID, TX_ID, dto);

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: TX_ID },
        data: { title: '저녁식사', amount: 20000 },
        include: { category: true },
      });
      expect(result.title).toBe('저녁식사');
    });

    it('categoryId를 변경할 때 카테고리 유효성을 검사한다', async () => {
      const newCatId = 'cat-002';
      const newCategory = { ...mockCategory, id: newCatId, name: '교통' };
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.category.findUnique.mockResolvedValue(newCategory);
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        categoryId: newCatId,
      });

      await service.update(USER_ID, TX_ID, { categoryId: newCatId });

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: newCatId },
      });
    });

    it('변경할 카테고리가 존재하지 않으면 NotFoundException을 던진다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(USER_ID, TX_ID, { categoryId: 'non-existent-cat' }),
      ).rejects.toThrow(new NotFoundException('카테고리를 찾을 수 없습니다.'));
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

    it('존재하지 않는 거래 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.update(USER_ID, 'non-existent', dto)).rejects.toThrow(
        new NotFoundException('거래 내역을 찾을 수 없습니다.'),
      );
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

    it('categoryId가 없으면 카테고리 조회를 하지 않는다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        amount: 9999,
      });

      await service.update(USER_ID, TX_ID, { amount: 9999 });

      expect(mockPrisma.category.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('remove - 거래 삭제', () => {
    it('존재하는 거래를 삭제하고 deleted: true를 반환한다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.delete.mockResolvedValue(mockTransaction);

      const result = await service.remove(USER_ID, TX_ID);

      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: TX_ID },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('존재하지 않는 거래 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, 'non-existent')).rejects.toThrow(
        new NotFoundException('거래 내역을 찾을 수 없습니다.'),
      );
      expect(mockPrisma.transaction.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCategories - 카테고리 목록 조회', () => {
    it('isActive인 카테고리를 정렬된 순서로 반환한다', async () => {
      const categories = [mockCategory];
      mockPrisma.category.findMany.mockResolvedValue(categories);

      const result = await service.getCategories();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      });
      expect(result).toEqual(categories);
    });

    it('활성 카테고리가 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await service.getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getMonthlySummary - 월별 요약 조회', () => {
    it('월별 수입/지출/저축 합계와 잔액을 계산한다', async () => {
      const transactions = [
        { ...mockTransaction, type: 'INCOME', amount: 3000000 },
        { ...mockTransaction, id: 'tx-002', type: 'EXPENSE', amount: 500000 },
        { ...mockTransaction, id: 'tx-003', type: 'EXPENSE', amount: 200000 },
        { ...mockTransaction, id: 'tx-004', type: 'SAVING', amount: 300000 },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getMonthlySummary(USER_ID, 2026, 3);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          date: {
            gte: new Date(2026, 2, 1),
            lte: new Date(2026, 3, 0),
          },
        },
      });
      expect(result).toEqual({
        month: '2026-03',
        totalIncome: 3000000,
        totalExpense: 700000,
        totalSaving: 300000,
        balance: 2000000,
      });
    });

    it('거래가 없는 달은 모든 합계가 0이다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getMonthlySummary(USER_ID, 2026, 2);

      expect(result).toEqual({
        month: '2026-02',
        totalIncome: 0,
        totalExpense: 0,
        totalSaving: 0,
        balance: 0,
      });
    });

    it('month가 한 자리 숫자이면 두 자리로 패딩한다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getMonthlySummary(USER_ID, 2026, 1);

      expect(result.month).toBe('2026-01');
    });

    it('월말 날짜 계산이 올바르다 (2월)', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getMonthlySummary(USER_ID, 2026, 2);

      // 2026년 2월 28일 (평년)
      const expectedEnd = new Date(2026, 2, 0);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ lte: expectedEnd }),
          }),
        }),
      );
    });

    it('수입만 있는 달의 잔액은 수입과 동일하다', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { ...mockTransaction, type: 'INCOME', amount: 5000000 },
      ]);

      const result = await service.getMonthlySummary(USER_ID, 2026, 3);

      expect(result.totalIncome).toBe(5000000);
      expect(result.totalExpense).toBe(0);
      expect(result.totalSaving).toBe(0);
      expect(result.balance).toBe(5000000);
    });
  });
});
