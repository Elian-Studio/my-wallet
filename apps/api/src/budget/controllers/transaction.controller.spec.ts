import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transaction.controller';
import { TransactionService } from '../services/transaction.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { QueryTransactionDto } from '../dto/query-transaction.dto';
import { NotFoundException } from '@nestjs/common';

const USER_ID = 'user-001';
const TX_ID = 'tx-001';
const CAT_ID = 'cat-001';

const mockReq = { user: { id: USER_ID } };

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
  type: 'EXPENSE',
  title: '점심식사',
  amount: 12000,
  date: new Date('2026-03-15'),
  isFixed: false,
  memo: null,
  createdAt: new Date('2026-03-15'),
  updatedAt: new Date('2026-03-15'),
  category: mockCategory,
};

const mockPaginatedResult = {
  data: [mockTransaction],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockTransactionService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getCategories: jest.fn(),
  getMonthlySummary: jest.fn(),
};

describe('TransactionController', () => {
  let controller: TransactionController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionController>(TransactionController);
  });

  describe('create - POST /', () => {
    it('거래를 생성하고 결과를 반환한다', async () => {
      const dto: CreateTransactionDto = {
        categoryId: CAT_ID,
        type: 'EXPENSE',
        title: '점심식사',
        amount: 12000,
        date: '2026-03-15',
      };
      mockTransactionService.create.mockResolvedValue(mockTransaction);

      const result = await controller.create(mockReq, dto);

      expect(mockTransactionService.create).toHaveBeenCalledWith(USER_ID, dto);
      expect(result).toEqual(mockTransaction);
    });

    it('req.user.id를 userId로 전달한다', async () => {
      const dto: CreateTransactionDto = {
        categoryId: CAT_ID,
        type: 'INCOME',
        title: '급여',
        amount: 3000000,
        date: '2026-03-25',
      };
      mockTransactionService.create.mockResolvedValue({
        ...mockTransaction,
        type: 'INCOME',
        title: '급여',
        amount: 3000000,
      });

      await controller.create(mockReq, dto);

      expect(mockTransactionService.create).toHaveBeenCalledWith(USER_ID, expect.anything());
    });
  });

  describe('findAll - GET /', () => {
    it('페이지네이션된 거래 목록을 반환한다', async () => {
      mockTransactionService.findAll.mockResolvedValue(mockPaginatedResult);
      const query = new QueryTransactionDto();

      const result = await controller.findAll(mockReq, query);

      expect(mockTransactionService.findAll).toHaveBeenCalledWith(USER_ID, query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('쿼리 필터를 서비스에 그대로 전달한다', async () => {
      mockTransactionService.findAll.mockResolvedValue({ ...mockPaginatedResult, data: [] });
      const query = new QueryTransactionDto();
      query.type = 'EXPENSE';
      query.categoryId = CAT_ID;

      await controller.findAll(mockReq, query);

      expect(mockTransactionService.findAll).toHaveBeenCalledWith(USER_ID, query);
    });
  });

  describe('getCategories - GET /categories', () => {
    it('카테고리 목록을 반환한다', async () => {
      const categories = [mockCategory];
      mockTransactionService.getCategories.mockResolvedValue(categories);

      const result = await controller.getCategories();

      expect(mockTransactionService.getCategories).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });

    it('카테고리가 없으면 빈 배열을 반환한다', async () => {
      mockTransactionService.getCategories.mockResolvedValue([]);

      const result = await controller.getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getMonthlySummary - GET /summary/:year/:month', () => {
    it('월별 요약 데이터를 반환한다', async () => {
      const summary = {
        month: '2026-03',
        totalIncome: 3000000,
        totalExpense: 700000,
        totalSaving: 300000,
        balance: 2000000,
      };
      mockTransactionService.getMonthlySummary.mockResolvedValue(summary);

      const result = await controller.getMonthlySummary(mockReq, 2026, 3);

      expect(mockTransactionService.getMonthlySummary).toHaveBeenCalledWith(USER_ID, 2026, 3);
      expect(result).toEqual(summary);
    });
  });

  describe('findOne - GET /:id', () => {
    it('단일 거래 내역을 반환한다', async () => {
      mockTransactionService.findOne.mockResolvedValue(mockTransaction);

      const result = await controller.findOne(mockReq, TX_ID);

      expect(mockTransactionService.findOne).toHaveBeenCalledWith(USER_ID, TX_ID);
      expect(result).toEqual(mockTransaction);
    });

    it('존재하지 않는 거래 조회 시 NotFoundException이 전파된다', async () => {
      mockTransactionService.findOne.mockRejectedValue(
        new NotFoundException('거래 내역을 찾을 수 없습니다.'),
      );

      await expect(controller.findOne(mockReq, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update - PUT /:id', () => {
    it('거래를 수정하고 수정된 결과를 반환한다', async () => {
      const dto: UpdateTransactionDto = { title: '저녁식사', amount: 25000 };
      const updatedTx = { ...mockTransaction, title: '저녁식사', amount: 25000 };
      mockTransactionService.update.mockResolvedValue(updatedTx);

      const result = await controller.update(mockReq, TX_ID, dto);

      expect(mockTransactionService.update).toHaveBeenCalledWith(USER_ID, TX_ID, dto);
      expect(result).toEqual(updatedTx);
    });

    it('존재하지 않는 거래 수정 시 NotFoundException이 전파된다', async () => {
      mockTransactionService.update.mockRejectedValue(
        new NotFoundException('거래 내역을 찾을 수 없습니다.'),
      );

      await expect(
        controller.update(mockReq, 'non-existent', { title: '수정' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove - DELETE /:id', () => {
    it('거래를 삭제하고 deleted: true를 반환한다', async () => {
      mockTransactionService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(mockReq, TX_ID);

      expect(mockTransactionService.remove).toHaveBeenCalledWith(USER_ID, TX_ID);
      expect(result).toEqual({ deleted: true });
    });

    it('존재하지 않는 거래 삭제 시 NotFoundException이 전파된다', async () => {
      mockTransactionService.remove.mockRejectedValue(
        new NotFoundException('거래 내역을 찾을 수 없습니다.'),
      );

      await expect(controller.remove(mockReq, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
