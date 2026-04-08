import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TradeService } from './trade.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FifoService } from './fifo.service';
import { CreateTradeDto } from '../dto/create-trade.dto';
import { UpdateTradeDto } from '../dto/update-trade.dto';
import { QueryTradeDto } from '../dto/query-trade.dto';

const USER_ID = 'user-001';
const TRADE_ID = 'trade-001';
const STOCK_ID = 'stock-001';
const ACCOUNT_ID = 'account-001';

const mockStock = {
  id: STOCK_ID,
  ticker: 'AAPL',
  name: '애플',
  market: 'NASDAQ',
};

const mockAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: '키움증권',
};

const mockBuyTrade = {
  id: TRADE_ID,
  userId: USER_ID,
  stockId: STOCK_ID,
  accountId: ACCOUNT_ID,
  type: 'BUY' as const,
  tradeDate: new Date('2026-01-15'),
  price: 50000,
  quantity: 10,
  reason: [],
  memo: null,
  stock: mockStock,
  account: mockAccount,
};

const mockSellTrade = {
  ...mockBuyTrade,
  id: 'trade-002',
  type: 'SELL' as const,
  tradeDate: new Date('2026-03-15'),
  price: 60000,
  quantity: 5,
};

const mockPrisma = {
  stock: {
    findUnique: jest.fn(),
  },
  stockAccount: {
    findFirst: jest.fn(),
  },
  trade: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  realizedGain: {
    count: jest.fn(),
  },
};

const mockFifoService = {
  calculateRealizedGain: jest.fn(),
};

describe('TradeService', () => {
  let service: TradeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FifoService, useValue: mockFifoService },
      ],
    }).compile();

    service = module.get<TradeService>(TradeService);
  });

  it('서비스가 정의된다', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  describe('create - 거래 생성', () => {
    const buyDto: CreateTradeDto = {
      stockId: STOCK_ID,
      accountId: ACCOUNT_ID,
      type: 'BUY',
      tradeDate: '2026-01-15',
      price: 50000,
      quantity: 10,
    };

    const sellDto: CreateTradeDto = {
      stockId: STOCK_ID,
      accountId: ACCOUNT_ID,
      type: 'SELL',
      tradeDate: '2026-03-15',
      price: 60000,
      quantity: 5,
    };

    describe('BUY 거래', () => {
      it('종목과 계좌 검증 후 BUY 거래를 생성한다', async () => {
        mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
        mockPrisma.trade.create.mockResolvedValue(mockBuyTrade);

        const result = await service.create(USER_ID, buyDto);

        expect(mockPrisma.stock.findUnique).toHaveBeenCalledWith({
          where: { id: STOCK_ID },
        });
        expect(mockPrisma.stockAccount.findFirst).toHaveBeenCalledWith({
          where: { id: ACCOUNT_ID, userId: USER_ID },
        });
        expect(mockPrisma.trade.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: USER_ID,
              stockId: STOCK_ID,
              accountId: ACCOUNT_ID,
              type: 'BUY',
              price: 50000,
              quantity: 10,
            }),
            include: { stock: true, account: true },
          }),
        );
        expect(mockFifoService.calculateRealizedGain).not.toHaveBeenCalled();
        expect(result).toEqual(mockBuyTrade);
      });

      it('종목이 없으면 NotFoundException을 던진다', async () => {
        mockPrisma.stock.findUnique.mockResolvedValue(null);
        mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);

        await expect(service.create(USER_ID, buyDto)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.create(USER_ID, buyDto)).rejects.toThrow(
          '종목을 찾을 수 없습니다.',
        );
      });

      it('계좌가 없으면 NotFoundException을 던진다', async () => {
        mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.stockAccount.findFirst.mockResolvedValue(null);

        await expect(service.create(USER_ID, buyDto)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.create(USER_ID, buyDto)).rejects.toThrow(
          '계좌를 찾을 수 없습니다.',
        );
      });
    });

    describe('SELL 거래', () => {
      it('보유 수량 충분 시 SELL 거래를 생성하고 FIFO를 실행한다', async () => {
        mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
        // groupBy: BUY=10, SELL=0 → holding=10
        mockPrisma.trade.groupBy.mockResolvedValue([
          { type: 'BUY', _sum: { quantity: 10 } },
        ]);
        mockPrisma.trade.create.mockResolvedValue(mockSellTrade);
        mockFifoService.calculateRealizedGain.mockResolvedValue(undefined);

        const result = await service.create(USER_ID, sellDto);

        expect(mockPrisma.trade.groupBy).toHaveBeenCalledWith(
          expect.objectContaining({
            by: ['type'],
            where: { userId: USER_ID, stockId: STOCK_ID, accountId: ACCOUNT_ID },
            _sum: { quantity: true },
          }),
        );
        expect(mockFifoService.calculateRealizedGain).toHaveBeenCalledWith(
          mockSellTrade.id,
        );
        expect(result).toEqual(mockSellTrade);
      });

      it('보유 수량 부족 시 BadRequestException을 던진다', async () => {
        mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
        // holding = 2, want to sell 5
        mockPrisma.trade.groupBy.mockResolvedValue([
          { type: 'BUY', _sum: { quantity: 2 } },
        ]);

        await expect(service.create(USER_ID, sellDto)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockPrisma.trade.create).not.toHaveBeenCalled();
      });

      it('보유 수량이 0일 때 SELL 시도 시 BadRequestException을 던진다', async () => {
        mockPrisma.stock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.stockAccount.findFirst.mockResolvedValue(mockAccount);
        mockPrisma.trade.groupBy.mockResolvedValue([]);

        await expect(service.create(USER_ID, sellDto)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  // ──────────────────────────────────────────────
  describe('findAll - 거래 목록 조회', () => {
    it('필터 없이 전체 목록과 페이지 정보를 반환한다', async () => {
      const trades = [mockBuyTrade];
      mockPrisma.trade.findMany.mockResolvedValue(trades);
      mockPrisma.trade.count.mockResolvedValue(1);

      const query = new QueryTradeDto();
      const result = await service.findAll(USER_ID, query);

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          include: { stock: true, account: true },
          orderBy: { tradeDate: 'desc' },
        }),
      );
      expect(result).toEqual({
        data: trades,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('stockId 필터를 적용한다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.trade.count.mockResolvedValue(0);

      const query = Object.assign(new QueryTradeDto(), { stockId: STOCK_ID });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, stockId: STOCK_ID },
        }),
      );
    });

    it('accountId 필터를 적용한다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.trade.count.mockResolvedValue(0);

      const query = Object.assign(new QueryTradeDto(), {
        accountId: ACCOUNT_ID,
      });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, accountId: ACCOUNT_ID },
        }),
      );
    });

    it('type 필터를 적용한다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.trade.count.mockResolvedValue(0);

      const query = Object.assign(new QueryTradeDto(), { type: 'BUY' as const });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, type: 'BUY' },
        }),
      );
    });

    it('날짜 범위 필터를 적용한다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.trade.count.mockResolvedValue(0);

      const query = Object.assign(new QueryTradeDto(), {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            tradeDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('페이지네이션 skip/take를 올바르게 전달한다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.trade.count.mockResolvedValue(0);

      const query = Object.assign(new QueryTradeDto(), { page: 2, limit: 10 });
      await service.findAll(USER_ID, query);

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ──────────────────────────────────────────────
  describe('findOne - 거래 단건 조회', () => {
    const tradeWithGains = {
      ...mockBuyTrade,
      realizedGainsAsSell: [],
    };

    it('거래를 반환한다', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(tradeWithGains);

      const result = await service.findOne(USER_ID, TRADE_ID);

      expect(mockPrisma.trade.findFirst).toHaveBeenCalledWith({
        where: { id: TRADE_ID, userId: USER_ID },
        include: {
          stock: true,
          account: true,
          realizedGainsAsSell: true,
        },
      });
      expect(result).toEqual(tradeWithGains);
    });

    it('거래가 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, TRADE_ID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(USER_ID, TRADE_ID)).rejects.toThrow(
        '거래 내역을 찾을 수 없습니다.',
      );
    });
  });

  // ──────────────────────────────────────────────
  describe('update - 거래 수정', () => {
    const tradeNoGains = { ...mockBuyTrade, realizedGainsAsSell: [] };
    const tradeWithGains = {
      ...mockSellTrade,
      realizedGainsAsSell: [{ id: 'rg-001' }],
    };

    const updateDto: UpdateTradeDto = { price: 55000 };

    it('FIFO 정산 이력이 없으면 거래를 수정한다', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(tradeNoGains);
      const updated = { ...mockBuyTrade, price: 55000 };
      mockPrisma.trade.update.mockResolvedValue(updated);

      const result = await service.update(USER_ID, TRADE_ID, updateDto);

      expect(mockPrisma.trade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRADE_ID },
          data: { price: 55000 },
          include: { stock: true, account: true },
        }),
      );
      expect(result).toEqual(updated);
    });

    it('FIFO 정산이 완료된 매도 거래는 수정할 수 없다 (BadRequestException)', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(tradeWithGains);

      await expect(
        service.update(USER_ID, mockSellTrade.id, updateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(USER_ID, mockSellTrade.id, updateDto),
      ).rejects.toThrow('FIFO 정산이 완료된 매도 거래는 수정할 수 없습니다.');
      expect(mockPrisma.trade.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  describe('remove - 거래 삭제', () => {
    const tradeNoGains = { ...mockBuyTrade, realizedGainsAsSell: [] };

    it('FIFO 정산 이력이 없으면 거래를 삭제한다', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(tradeNoGains);
      mockPrisma.realizedGain.count.mockResolvedValue(0);
      mockPrisma.trade.delete.mockResolvedValue(mockBuyTrade);

      const result = await service.remove(USER_ID, TRADE_ID);

      expect(mockPrisma.realizedGain.count).toHaveBeenCalledWith({
        where: { OR: [{ buyTradeId: TRADE_ID }, { sellTradeId: TRADE_ID }] },
      });
      expect(mockPrisma.trade.delete).toHaveBeenCalledWith({
        where: { id: TRADE_ID },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('FIFO 정산 이력이 있으면 삭제할 수 없다 (BadRequestException)', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(tradeNoGains);
      mockPrisma.realizedGain.count.mockResolvedValue(2);

      await expect(service.remove(USER_ID, TRADE_ID)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(USER_ID, TRADE_ID)).rejects.toThrow(
        'FIFO 정산 이력이 있는 거래는 삭제할 수 없습니다.',
      );
      expect(mockPrisma.trade.delete).not.toHaveBeenCalled();
    });
  });
});
