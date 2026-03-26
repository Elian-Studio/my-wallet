import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  trade: { findMany: jest.fn() },
  realizedGain: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
};

const makeStock = (id: string, code: string, name: string, price: number) => ({
  id,
  code,
  name,
  isActive: true,
  market: 'KRX',
  stockPrices: price ? [{ stockId: id, price, change: 0, changeRate: 0, fetchedAt: new Date() }] : [],
});

const makeTrade = (
  id: string,
  userId: string,
  stockId: string,
  type: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  stock: ReturnType<typeof makeStock>,
  tradeDate = new Date('2026-01-10'),
  accountId?: string,
) => ({
  id,
  userId,
  stockId,
  type,
  quantity,
  price,
  tradeDate,
  accountId: accountId ?? 'acc-1',
  stock,
});

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    jest.clearAllMocks();
  });

  describe('getHoldings', () => {
    it('거래 내역이 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      const result = await service.getHoldings('user-1');

      expect(result).toEqual([]);
    });

    it('매수만 있는 경우 올바른 avgBuyPrice와 evaluation을 계산한다', async () => {
      const stock = makeStock('s1', 'KRX001', '삼성전자', 70000);
      const trades = [
        makeTrade('t1', 'user-1', 's1', 'BUY', 10, 60000, stock),
      ];
      mockPrisma.trade.findMany.mockResolvedValue(trades);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      const result = await service.getHoldings('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].stockId).toBe('s1');
      expect(result[0].quantity).toBe(10);
      expect(result[0].avgBuyPrice).toBe(60000);
      expect(result[0].evaluation).toBe(700000); // 70000 * 10
      expect(result[0].weight).toBe(100);
    });

    it('매수 후 일부 매도 시 avgBuyPrice를 매도 원가 제외하여 계산한다', async () => {
      const stock = makeStock('s1', 'KRX001', '삼성전자', 70000);
      const trades = [
        makeTrade('t1', 'user-1', 's1', 'BUY', 10, 60000, stock, new Date('2026-01-01')),
        makeTrade('t2', 'user-1', 's1', 'SELL', 3, 70000, stock, new Date('2026-01-05')),
      ];
      // realizedGain: 매도 3주, 매수가 60000
      const gains = [
        { id: 'g1', buyTradeId: 't1', sellTradeId: 't2', quantity: 3, buyPrice: 60000, gain: 30000, sellTrade: trades[1] },
      ];
      mockPrisma.trade.findMany.mockResolvedValue(trades);
      mockPrisma.realizedGain.findMany.mockResolvedValue(gains);

      const result = await service.getHoldings('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(7); // 10 - 3
      // totalBuyCost = 600000, soldCost = 180000, remaining = 420000, avgBuyPrice = 420000/7 = 60000
      expect(result[0].avgBuyPrice).toBe(60000);
    });

    it('여러 종목이 있을 때 evaluation 내림차순으로 정렬되고 weight 합이 100%가 된다', async () => {
      const stockA = makeStock('sA', 'A001', '종목A', 100000);
      const stockB = makeStock('sB', 'B001', '종목B', 50000);
      const trades = [
        makeTrade('t1', 'user-1', 'sA', 'BUY', 2, 80000, stockA), // eval: 200000
        makeTrade('t2', 'user-1', 'sB', 'BUY', 5, 40000, stockB), // eval: 250000
      ];
      mockPrisma.trade.findMany.mockResolvedValue(trades);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      const result = await service.getHoldings('user-1');

      expect(result).toHaveLength(2);
      // sB has higher eval (250000) → comes first
      expect(result[0].stockId).toBe('sB');
      expect(result[1].stockId).toBe('sA');

      const totalWeight = result.reduce((s, h) => s + h.weight, 0);
      expect(totalWeight).toBeCloseTo(100, 1);
    });

    it('전량 매도한 종목은 결과에서 제외된다', async () => {
      const stock = makeStock('s1', 'KRX001', '삼성전자', 70000);
      const trades = [
        makeTrade('t1', 'user-1', 's1', 'BUY', 5, 60000, stock, new Date('2026-01-01')),
        makeTrade('t2', 'user-1', 's1', 'SELL', 5, 70000, stock, new Date('2026-01-05')),
      ];
      mockPrisma.trade.findMany.mockResolvedValue(trades);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      const result = await service.getHoldings('user-1');

      expect(result).toHaveLength(0);
    });

    it('accountId 필터를 전달하면 trade 조회 where 절에 포함된다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      await service.getHoldings('user-1', 'acc-99');

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', accountId: 'acc-99' }),
        }),
      );
    });
  });

  describe('getSummary', () => {
    it('보유 종목이 없을 때 모든 합계가 0이다', async () => {
      mockPrisma.trade.findMany.mockResolvedValue([]);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);
      mockPrisma.realizedGain.aggregate.mockResolvedValue({ _sum: { gain: null } });

      const result = await service.getSummary('user-1');

      expect(result.totalEvaluation).toBe(0);
      expect(result.totalInvested).toBe(0);
      expect(result.totalUnrealizedGain).toBe(0);
      expect(result.totalUnrealizedGainRate).toBe(0);
      expect(result.totalRealizedGain).toBe(0);
    });

    it('보유 종목과 실현손익이 있을 때 올바른 합계를 계산한다', async () => {
      const stock = makeStock('s1', 'KRX001', '삼성전자', 70000);
      const trades = [
        makeTrade('t1', 'user-1', 's1', 'BUY', 10, 60000, stock),
      ];
      mockPrisma.trade.findMany.mockResolvedValue(trades);
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);
      mockPrisma.realizedGain.aggregate.mockResolvedValue({ _sum: { gain: 50000 } });

      const result = await service.getSummary('user-1');

      expect(result.totalEvaluation).toBe(700000); // 70000 * 10
      expect(result.totalInvested).toBe(600000);   // 60000 * 10
      expect(result.totalUnrealizedGain).toBe(100000);
      expect(result.totalUnrealizedGainRate).toBeCloseTo(16.67, 1);
      expect(result.totalRealizedGain).toBe(50000);
    });
  });

  describe('getPerformance', () => {
    it('거래 내역이 없어도 12개월 항목을 반환한다', async () => {
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      const result = await service.getPerformance('user-1', 2026);

      expect(result).toHaveLength(12);
      result.forEach((item) => {
        expect(item.realizedGain).toBe(0);
        expect(item.tradeCount).toBe(0);
      });
    });

    it('실현이익을 월별로 올바르게 집계한다', async () => {
      const sellTrade1 = { id: 'st1', tradeDate: new Date('2026-03-15'), userId: 'user-1', accountId: 'acc-1' };
      const sellTrade2 = { id: 'st2', tradeDate: new Date('2026-03-20'), userId: 'user-1', accountId: 'acc-1' };
      const gains = [
        { id: 'g1', sellTradeId: 'st1', buyTradeId: 'bt1', gain: 30000, quantity: 5, buyPrice: 60000, sellTrade: sellTrade1 },
        { id: 'g2', sellTradeId: 'st1', buyTradeId: 'bt2', gain: 10000, quantity: 2, buyPrice: 60000, sellTrade: sellTrade1 },
        { id: 'g3', sellTradeId: 'st2', buyTradeId: 'bt3', gain: 20000, quantity: 3, buyPrice: 60000, sellTrade: sellTrade2 },
      ];
      mockPrisma.realizedGain.findMany.mockResolvedValue(gains);

      const result = await service.getPerformance('user-1', 2026);

      const march = result.find((r) => r.month === '2026-03');
      expect(march).toBeDefined();
      expect(march!.realizedGain).toBe(60000); // 30000 + 10000 + 20000
      // st1 and st2 are 2 distinct trade IDs
      expect(march!.tradeCount).toBe(2);

      // other months should be 0
      const jan = result.find((r) => r.month === '2026-01');
      expect(jan!.realizedGain).toBe(0);
    });

    it('accountId 필터를 적용하면 realizedGain 조회 where 절에 포함된다', async () => {
      mockPrisma.realizedGain.findMany.mockResolvedValue([]);

      await service.getPerformance('user-1', 2026, 'acc-99');

      expect(mockPrisma.realizedGain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sellTrade: expect.objectContaining({ accountId: 'acc-99' }),
          }),
        }),
      );
    });
  });
});
