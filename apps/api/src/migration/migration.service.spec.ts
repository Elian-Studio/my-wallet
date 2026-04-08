import { Test, TestingModule } from '@nestjs/testing';
import { MigrationService } from './migration.service';
import { PrismaService } from '../prisma/prisma.service';
import { FifoService } from '../stock/services/fifo.service';
import { BadRequestException } from '@nestjs/common';

const USER_ID = 'user-001';
const CAT_ID = 'cat-001';
const STOCK_ID = 'stock-001';
const ACCOUNT_ID = 'account-001';
const TRADE_ID = 'trade-001';

const mockCategory = {
  id: CAT_ID,
  name: '식비',
  type: 'EXPENSE',
  sortOrder: 1,
  isActive: true,
};

const mockStock = {
  id: STOCK_ID,
  code: '005930',
  name: '삼성전자',
  market: 'KRX',
  isActive: true,
};

const mockAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  type: 'GENERAL',
  broker: '키움증권',
  alias: null,
  isActive: true,
};

const mockTrade = {
  id: TRADE_ID,
  userId: USER_ID,
  stockId: STOCK_ID,
  accountId: ACCOUNT_ID,
  type: 'BUY',
  tradeDate: new Date('2026-01-10'),
  price: 70000,
  quantity: 10,
  reason: [],
  memo: null,
};

const mockPrisma = {
  category: {
    findFirst: jest.fn(),
  },
  transaction: {
    createMany: jest.fn(),
  },
  budget: {
    upsert: jest.fn(),
  },
  stock: {
    findUnique: jest.fn(),
  },
  stockAccount: {
    findFirst: jest.fn(),
  },
  trade: {
    create: jest.fn(),
  },
};

const mockFifoService = {
  calculateRealizedGain: jest.fn(),
};

describe('MigrationService', () => {
  let service: MigrationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FifoService, useValue: mockFifoService },
      ],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
  });

  describe('importTransactions - 거래 내역 일괄 가져오기', () => {
    it('유효한 카테고리로 거래를 일괄 생성한다', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.transaction.createMany.mockResolvedValue({ count: 2 });

      const result = await service.importTransactions(USER_ID, {
        items: [
          {
            categoryName: '식비',
            type: 'EXPENSE',
            title: '점심식사',
            amount: 12000,
            date: '2026-03-15',
          },
          {
            categoryName: '식비',
            type: 'EXPENSE',
            title: '저녁식사',
            amount: 15000,
            date: '2026-03-16',
            isFixed: false,
            memo: '맛집',
          },
        ],
      });

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.transaction.createMany).toHaveBeenCalledTimes(1);
    });

    it('카테고리를 찾을 수 없으면 해당 항목을 건너뛴다', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      const result = await service.importTransactions(USER_ID, {
        items: [
          {
            categoryName: '없는카테고리',
            type: 'EXPENSE',
            title: '테스트',
            amount: 1000,
            date: '2026-03-15',
          },
        ],
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('없는카테고리');
      expect(mockPrisma.transaction.createMany).not.toHaveBeenCalled();
    });

    it('카테고리를 찾을 수 없는 항목은 건너뛰고 나머지는 가져온다', async () => {
      mockPrisma.category.findFirst
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);
      mockPrisma.transaction.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importTransactions(USER_ID, {
        items: [
          {
            categoryName: '식비',
            type: 'EXPENSE',
            title: '점심',
            amount: 12000,
            date: '2026-03-15',
          },
          {
            categoryName: '없는카테고리',
            type: 'EXPENSE',
            title: '저녁',
            amount: 15000,
            date: '2026-03-16',
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('빈 목록은 처리하지 않는다', async () => {
      mockPrisma.transaction.createMany.mockResolvedValue({ count: 0 });

      // DTO validation prevents empty array, but service handles it gracefully
      const result = await service.importTransactions(USER_ID, {
        items: [],
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.transaction.createMany).not.toHaveBeenCalled();
    });
  });

  describe('importBudgets - 예산 일괄 가져오기', () => {
    it('유효한 카테고리로 예산을 일괄 생성한다', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.budget.upsert.mockResolvedValue({ id: 'budget-001' });

      const result = await service.importBudgets(USER_ID, {
        items: [
          {
            categoryName: '식비',
            type: 'EXPENSE',
            month: '2026-03-01',
            amount: 300000,
          },
          {
            categoryName: '식비',
            type: 'EXPENSE',
            month: '2026-04-01',
            amount: 320000,
          },
        ],
      });

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.budget.upsert).toHaveBeenCalledTimes(2);
    });

    it('동일한 userId+categoryId+month 조합은 upsert로 업데이트한다', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.budget.upsert.mockResolvedValue({ id: 'budget-001', amount: 350000 });

      const result = await service.importBudgets(USER_ID, {
        items: [
          {
            categoryName: '식비',
            type: 'EXPENSE',
            month: '2026-03-01',
            amount: 350000,
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockPrisma.budget.upsert).toHaveBeenCalledWith({
        where: {
          userId_categoryId_month: {
            userId: USER_ID,
            categoryId: CAT_ID,
            month: new Date('2026-03-01'),
          },
        },
        update: { amount: 350000, type: 'EXPENSE' },
        create: {
          userId: USER_ID,
          categoryId: CAT_ID,
          type: 'EXPENSE',
          month: new Date('2026-03-01'),
          amount: 350000,
        },
      });
    });

    it('카테고리를 찾을 수 없으면 건너뛴다', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      const result = await service.importBudgets(USER_ID, {
        items: [
          {
            categoryName: '없는카테고리',
            type: 'EXPENSE',
            month: '2026-03-01',
            amount: 300000,
          },
        ],
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('없는카테고리');
      expect(mockPrisma.budget.upsert).not.toHaveBeenCalled();
    });
  });

  describe('importTrades - 주식 거래 일괄 가져오기', () => {
    it('BUY 거래를 정상적으로 가져온다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.trade.create.mockResolvedValue({ ...mockTrade, type: 'BUY' });

      const result = await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-01-10',
            price: 70000,
            quantity: 10,
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.totalBuyAmount).toBe(700000);
      expect(result.totalSellAmount).toBe(0);
      expect(mockFifoService.calculateRealizedGain).not.toHaveBeenCalled();
    });

    it('SELL 거래에 대해 FIFO 계산을 호출한다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.trade.create.mockResolvedValue({ ...mockTrade, id: 'sell-001', type: 'SELL', price: 80000 });
      mockFifoService.calculateRealizedGain.mockResolvedValue(undefined);

      const result = await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'SELL',
            tradeDate: '2026-02-10',
            price: 80000,
            quantity: 5,
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.totalSellAmount).toBe(400000);
      expect(mockFifoService.calculateRealizedGain).toHaveBeenCalledWith('sell-001');
    });

    it('FIFO 계산 오류가 발생해도 거래는 가져온다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.trade.create.mockResolvedValue({ ...mockTrade, id: 'sell-001', type: 'SELL', price: 80000 });
      mockFifoService.calculateRealizedGain.mockRejectedValue(
        new BadRequestException('FIFO 매칭 실패'),
      );

      const result = await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'SELL',
            tradeDate: '2026-02-10',
            price: 80000,
            quantity: 5,
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('FIFO 계산 오류');
    });

    it('종목을 찾을 수 없으면 건너뛴다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(null);

      const result = await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '999999',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-01-10',
            price: 10000,
            quantity: 10,
          },
        ],
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('999999');
      expect(mockPrisma.trade.create).not.toHaveBeenCalled();
    });

    it('계좌를 찾을 수 없으면 건너뛴다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.stockAccount.findFirst.mockResolvedValue(null);

      const result = await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '005930',
            accountBroker: '없는증권사',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-01-10',
            price: 70000,
            quantity: 10,
          },
        ],
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('없는증권사');
      expect(mockPrisma.trade.create).not.toHaveBeenCalled();
    });

    it('거래를 tradeDate ASC 순으로 정렬하여 처리한다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);

      const tradeCalls: string[] = [];
      mockPrisma.trade.create.mockImplementation((args: { data: { tradeDate: Date; type: string } }) => {
        tradeCalls.push(args.data.tradeDate.toISOString().split('T')[0]);
        return Promise.resolve({ ...mockTrade, type: args.data.type });
      });

      await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-03-01',
            price: 70000,
            quantity: 5,
          },
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-01-15',
            price: 65000,
            quantity: 10,
          },
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-02-10',
            price: 68000,
            quantity: 7,
          },
        ],
      });

      expect(tradeCalls[0]).toBe('2026-01-15');
      expect(tradeCalls[1]).toBe('2026-02-10');
      expect(tradeCalls[2]).toBe('2026-03-01');
    });

    it('BUY와 SELL 거래의 금액을 합산한다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
      mockFifoService.calculateRealizedGain.mockResolvedValue(undefined);

      mockPrisma.trade.create
        .mockResolvedValueOnce({ ...mockTrade, type: 'BUY', price: 70000, quantity: 10 })
        .mockResolvedValueOnce({ ...mockTrade, id: 'sell-001', type: 'SELL', price: 80000, quantity: 5 });

      const result = await service.importTrades(USER_ID, {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'BUY',
            tradeDate: '2026-01-10',
            price: 70000,
            quantity: 10,
          },
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL',
            type: 'SELL',
            tradeDate: '2026-02-10',
            price: 80000,
            quantity: 5,
          },
        ],
      });

      expect(result.imported).toBe(2);
      expect(result.totalBuyAmount).toBe(700000);
      expect(result.totalSellAmount).toBe(400000);
    });
  });
});
