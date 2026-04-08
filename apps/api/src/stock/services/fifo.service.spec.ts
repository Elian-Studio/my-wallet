import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FifoService } from './fifo.service';
import { PrismaService } from '../../prisma/prisma.service';

const USER_ID = 'user-001';
const STOCK_ID = 'stock-001';
const ACCOUNT_ID = 'account-001';

// Helper to build a minimal trade object
function makeTrade(
  id: string,
  type: 'BUY' | 'SELL',
  price: number,
  quantity: number,
  tradeDateStr: string,
) {
  return {
    id,
    userId: USER_ID,
    stockId: STOCK_ID,
    accountId: ACCOUNT_ID,
    type,
    price,
    quantity,
    tradeDate: new Date(tradeDateStr),
    reason: [],
    memo: null,
  };
}

const mockPrisma = {
  trade: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  realizedGain: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('FifoService', () => {
  let service: FifoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FifoService>(FifoService);
  });

  it('서비스가 정의된다', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  describe('calculateRealizedGain - FIFO 실현손익 계산', () => {
    describe('입력 유효성 검증', () => {
      it('존재하지 않는 거래 ID면 BadRequestException을 던진다', async () => {
        mockPrisma.trade.findUnique.mockResolvedValue(null);

        await expect(
          service.calculateRealizedGain('nonexistent'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.calculateRealizedGain('nonexistent'),
        ).rejects.toThrow('유효한 매도 거래가 아닙니다.');
      });

      it('SELL 타입이 아닌 거래면 BadRequestException을 던진다', async () => {
        const buyTrade = makeTrade('buy-001', 'BUY', 50000, 10, '2026-01-15');
        mockPrisma.trade.findUnique.mockResolvedValue(buyTrade);

        await expect(
          service.calculateRealizedGain('buy-001'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.calculateRealizedGain('buy-001'),
        ).rejects.toThrow('유효한 매도 거래가 아닙니다.');
      });
    });

    describe('단순 FIFO 매칭 — 매수 1건, 전량 매도', () => {
      it('전량 매도 시 1개의 실현이익 레코드를 생성한다', async () => {
        const sellTrade = makeTrade('sell-001', 'SELL', 60000, 10, '2026-03-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 50000, 10, '2026-01-15');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 1 });

        await service.calculateRealizedGain('sell-001');

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            {
              buyTradeId: 'buy-001',
              sellTradeId: 'sell-001',
              quantity: 10,
              buyPrice: 50000,
              sellPrice: 60000,
              gain: (60000 - 50000) * 10, // 100_000
            },
          ],
        });
      });

      it('이익 금액을 올바르게 계산한다 (차익)', async () => {
        const sellTrade = makeTrade('sell-001', 'SELL', 70000, 5, '2026-03-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 40000, 5, '2026-01-15');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 1 });

        await service.calculateRealizedGain('sell-001');

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              gain: (70000 - 40000) * 5, // 150_000
            }),
          ],
        });
      });

      it('손실 시나리오에서 음수 gain을 올바르게 계산한다', async () => {
        const sellTrade = makeTrade('sell-001', 'SELL', 30000, 5, '2026-03-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 50000, 5, '2026-01-15');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 1 });

        await service.calculateRealizedGain('sell-001');

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              gain: (30000 - 50000) * 5, // -100_000
            }),
          ],
        });
      });
    });

    describe('복수 매수, 부분 매도 — FIFO 순서 검증', () => {
      it('복수의 매수 건에서 FIFO 순서로 매칭하여 복수 레코드를 생성한다', async () => {
        // buy-001: 10주 @ 40000 (먼저)
        // buy-002: 10주 @ 50000 (나중)
        // sell: 15주 → buy-001에서 10, buy-002에서 5
        const sellTrade = makeTrade('sell-001', 'SELL', 60000, 15, '2026-03-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 40000, 10, '2026-01-10');
        const buyTrade2 = makeTrade('buy-002', 'BUY', 50000, 10, '2026-02-01');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1, buyTrade2]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 2 });

        await service.calculateRealizedGain('sell-001');

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            {
              buyTradeId: 'buy-001',
              sellTradeId: 'sell-001',
              quantity: 10,
              buyPrice: 40000,
              sellPrice: 60000,
              gain: (60000 - 40000) * 10,
            },
            {
              buyTradeId: 'buy-002',
              sellTradeId: 'sell-001',
              quantity: 5,
              buyPrice: 50000,
              sellPrice: 60000,
              gain: (60000 - 50000) * 5,
            },
          ],
        });
      });
    });

    describe('이미 사용된 매수 수량 처리', () => {
      it('기존 RealizedGain에서 이미 소진된 수량을 제외하고 남은 수량만 사용한다', async () => {
        // buy-001: 10주 @ 40000
        // 기존 정산: buy-001에서 6주 이미 사용
        // sell: 4주 → buy-001에서 남은 4주만 매칭
        const sellTrade = makeTrade('sell-002', 'SELL', 60000, 4, '2026-04-01');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 40000, 10, '2026-01-10');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        // 이미 6주 사용됨
        mockPrisma.realizedGain.findMany.mockResolvedValue([
          { buyTradeId: 'buy-001', quantity: 6 },
        ]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 1 });

        await service.calculateRealizedGain('sell-002');

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            {
              buyTradeId: 'buy-001',
              sellTradeId: 'sell-002',
              quantity: 4, // 10 - 6 = 4 남음
              buyPrice: 40000,
              sellPrice: 60000,
              gain: (60000 - 40000) * 4,
            },
          ],
        });
      });

      it('모든 매수 수량이 이미 사용됐고 잔여가 없을 때 BadRequestException을 던진다', async () => {
        const sellTrade = makeTrade('sell-003', 'SELL', 60000, 5, '2026-04-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 40000, 10, '2026-01-10');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        // buy-001 전량 소진
        mockPrisma.realizedGain.findMany.mockResolvedValue([
          { buyTradeId: 'buy-001', quantity: 10 },
        ]);

        await expect(
          service.calculateRealizedGain('sell-003'),
        ).rejects.toThrow(BadRequestException);
      });

      it('여러 기존 정산이 있을 때 누적 사용 수량을 올바르게 집계한다', async () => {
        // buy-001: 10주
        // 기존 정산: 3주 + 4주 = 7주 사용
        // sell: 3주 → 나머지 3주 매칭
        const sellTrade = makeTrade('sell-004', 'SELL', 65000, 3, '2026-05-01');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 45000, 10, '2026-01-10');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([
          { buyTradeId: 'buy-001', quantity: 3 },
          { buyTradeId: 'buy-001', quantity: 4 },
        ]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 1 });

        await service.calculateRealizedGain('sell-004');

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              buyTradeId: 'buy-001',
              quantity: 3, // 10 - 7 = 3
            }),
          ],
        });
      });
    });

    describe('매수 수량 부족', () => {
      it('매수 내역이 전혀 없을 때 BadRequestException을 던진다', async () => {
        const sellTrade = makeTrade('sell-001', 'SELL', 60000, 5, '2026-03-15');
        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);

        await expect(
          service.calculateRealizedGain('sell-001'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.calculateRealizedGain('sell-001'),
        ).rejects.toThrow('FIFO 매칭 실패');
      });

      it('매수 수량이 매도 수량보다 부족할 때 BadRequestException을 던진다', async () => {
        // buy: 3주, sell: 5주 → 2주 부족
        const sellTrade = makeTrade('sell-001', 'SELL', 60000, 5, '2026-03-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 40000, 3, '2026-01-10');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);

        await expect(
          service.calculateRealizedGain('sell-001'),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrisma.realizedGain.createMany).not.toHaveBeenCalled();
      });
    });

    describe('경계값 테스트', () => {
      it('정확히 수량이 일치할 때 정상적으로 처리한다', async () => {
        const sellTrade = makeTrade('sell-001', 'SELL', 55000, 7, '2026-03-15');
        const buyTrade1 = makeTrade('buy-001', 'BUY', 45000, 7, '2026-01-10');

        mockPrisma.trade.findUnique.mockResolvedValue(sellTrade);
        mockPrisma.trade.findMany.mockResolvedValue([buyTrade1]);
        mockPrisma.realizedGain.findMany.mockResolvedValue([]);
        mockPrisma.realizedGain.createMany.mockResolvedValue({ count: 1 });

        await expect(
          service.calculateRealizedGain('sell-001'),
        ).resolves.not.toThrow();

        expect(mockPrisma.realizedGain.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({ quantity: 7, gain: (55000 - 45000) * 7 }),
          ],
        });
      });
    });
  });

  // ──────────────────────────────────────────────
  describe('getRealizedGainsByTrade - 매도 거래별 실현이익 조회', () => {
    it('sellTradeId에 해당하는 실현이익 목록을 buyTrade 포함하여 반환한다', async () => {
      const gains = [
        {
          id: 'rg-001',
          sellTradeId: 'sell-001',
          buyTradeId: 'buy-001',
          quantity: 5,
          buyPrice: 40000,
          sellPrice: 60000,
          gain: 100000,
          buyTrade: {
            id: 'buy-001',
            stock: { id: STOCK_ID, ticker: 'AAPL' },
          },
        },
      ];
      mockPrisma.realizedGain.findMany.mockResolvedValue(gains);

      const result = await service.getRealizedGainsByTrade('sell-001');

      expect(mockPrisma.realizedGain.findMany).toHaveBeenCalledWith({
        where: { sellTradeId: 'sell-001' },
        include: {
          buyTrade: { include: { stock: true } },
        },
        orderBy: { buyTrade: { tradeDate: 'asc' } },
      });
      expect(result).toEqual(gains);
    });

    it('해당하는 이익 레코드가 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      const result = await service.getRealizedGainsByTrade('sell-999');

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  describe('getTotalRealizedGain - 누적 실현이익 집계', () => {
    it('userId로 전체 실현이익 합산을 반환한다', async () => {
      mockPrisma.realizedGain.aggregate.mockResolvedValue({
        _sum: { gain: 500000 },
      });

      const result = await service.getTotalRealizedGain(USER_ID);

      expect(mockPrisma.realizedGain.aggregate).toHaveBeenCalledWith({
        where: { sellTrade: { userId: USER_ID } },
        _sum: { gain: true },
      });
      expect(result).toBe(500000);
    });

    it('stockId 필터를 포함하여 집계한다', async () => {
      mockPrisma.realizedGain.aggregate.mockResolvedValue({
        _sum: { gain: 200000 },
      });

      const result = await service.getTotalRealizedGain(USER_ID, STOCK_ID);

      expect(mockPrisma.realizedGain.aggregate).toHaveBeenCalledWith({
        where: { sellTrade: { userId: USER_ID, stockId: STOCK_ID } },
        _sum: { gain: true },
      });
      expect(result).toBe(200000);
    });

    it('accountId 필터를 포함하여 집계한다', async () => {
      mockPrisma.realizedGain.aggregate.mockResolvedValue({
        _sum: { gain: 150000 },
      });

      const result = await service.getTotalRealizedGain(
        USER_ID,
        undefined,
        ACCOUNT_ID,
      );

      expect(mockPrisma.realizedGain.aggregate).toHaveBeenCalledWith({
        where: { sellTrade: { userId: USER_ID, accountId: ACCOUNT_ID } },
        _sum: { gain: true },
      });
      expect(result).toBe(150000);
    });

    it('stockId와 accountId 모두 지정하여 집계한다', async () => {
      mockPrisma.realizedGain.aggregate.mockResolvedValue({
        _sum: { gain: 80000 },
      });

      const result = await service.getTotalRealizedGain(
        USER_ID,
        STOCK_ID,
        ACCOUNT_ID,
      );

      expect(mockPrisma.realizedGain.aggregate).toHaveBeenCalledWith({
        where: {
          sellTrade: {
            userId: USER_ID,
            stockId: STOCK_ID,
            accountId: ACCOUNT_ID,
          },
        },
        _sum: { gain: true },
      });
      expect(result).toBe(80000);
    });

    it('실현이익이 없을 때 0을 반환한다', async () => {
      mockPrisma.realizedGain.aggregate.mockResolvedValue({
        _sum: { gain: null },
      });

      const result = await service.getTotalRealizedGain(USER_ID);

      expect(result).toBe(0);
    });
  });
});
