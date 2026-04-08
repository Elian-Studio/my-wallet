import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from '../services/portfolio.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const mockPortfolioService = {
  getSummary: jest.fn(),
  getHoldings: jest.fn(),
  getPerformance: jest.fn(),
};

const mockReq = { user: { id: 'user-1' } };

describe('PortfolioController', () => {
  let controller: PortfolioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [{ provide: PortfolioService, useValue: mockPortfolioService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PortfolioController>(PortfolioController);
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의된다', () => {
    expect(controller).toBeDefined();
  });

  describe('JwtAuthGuard 적용', () => {
    it('컨트롤러 클래스에 JwtAuthGuard가 적용되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', PortfolioController);
      expect(guards).toBeDefined();
      expect(guards.some((g: Function) => g === JwtAuthGuard)).toBe(true);
    });
  });

  describe('getSummary (GET /portfolio/summary)', () => {
    it('PortfolioService.getSummary를 userId와 accountId로 호출한다', async () => {
      const mockSummary = {
        totalEvaluation: 700000,
        totalInvested: 600000,
        totalUnrealizedGain: 100000,
        totalUnrealizedGainRate: 16.67,
        totalRealizedGain: 50000,
      };
      mockPortfolioService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockReq, 'acc-1');

      expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', 'acc-1');
      expect(result).toEqual(mockSummary);
    });

    it('accountId 없이 호출하면 undefined를 전달한다', async () => {
      mockPortfolioService.getSummary.mockResolvedValue({});

      await controller.getSummary(mockReq, undefined);

      expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', undefined);
    });
  });

  describe('getHoldings (GET /portfolio/holdings)', () => {
    it('PortfolioService.getHoldings를 userId와 accountId로 호출한다', async () => {
      const mockHoldings = [
        {
          stockId: 's1',
          stockName: '삼성전자',
          stockCode: 'KRX001',
          quantity: 10,
          avgBuyPrice: 60000,
          currentPrice: 70000,
          evaluation: 700000,
          invested: 600000,
          unrealizedGain: 100000,
          unrealizedGainRate: 16.67,
          weight: 100,
        },
      ];
      mockPortfolioService.getHoldings.mockResolvedValue(mockHoldings);

      const result = await controller.getHoldings(mockReq, 'acc-1');

      expect(mockPortfolioService.getHoldings).toHaveBeenCalledWith('user-1', 'acc-1');
      expect(result).toEqual(mockHoldings);
    });
  });

  describe('getPerformance (GET /portfolio/performance)', () => {
    it('PortfolioService.getPerformance를 userId, year, accountId로 호출한다', async () => {
      const mockPerformance = Array.from({ length: 12 }, (_, i) => ({
        month: `2026-${String(i + 1).padStart(2, '0')}`,
        realizedGain: 0,
        tradeCount: 0,
      }));
      mockPortfolioService.getPerformance.mockResolvedValue(mockPerformance);

      const result = await controller.getPerformance(mockReq, 2026, 'acc-1');

      expect(mockPortfolioService.getPerformance).toHaveBeenCalledWith('user-1', 2026, 'acc-1');
      expect(result).toHaveLength(12);
    });
  });
});
