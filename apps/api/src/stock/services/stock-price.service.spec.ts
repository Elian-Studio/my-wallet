import { Test, TestingModule } from '@nestjs/testing';
import { StockPriceService } from './stock-price.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  stockPrice: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
};

const freshDate = () => new Date(Date.now() - 60 * 1000); // 1분 전 (캐시 유효)
const staleDate = () => new Date(Date.now() - 10 * 60 * 1000); // 10분 전 (캐시 만료)

describe('StockPriceService', () => {
  let service: StockPriceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockPriceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StockPriceService>(StockPriceService);
    jest.clearAllMocks();
  });

  describe('getPrice', () => {
    it('캐시가 신선하면 isCached=true로 반환한다', async () => {
      const fetchedAt = freshDate();
      mockPrisma.stockPrice.findUnique.mockResolvedValue({
        stockId: 's1',
        price: 70000,
        change: 500,
        changeRate: 0.72,
        fetchedAt,
      });

      const result = await service.getPrice('s1');

      expect(result).not.toBeNull();
      expect(result!.price).toBe(70000);
      expect(result!.isCached).toBe(true);
    });

    it('캐시가 만료된 경우에도 isCached=true로 반환한다 (서비스 캐시 정책)', async () => {
      const fetchedAt = staleDate();
      mockPrisma.stockPrice.findUnique.mockResolvedValue({
        stockId: 's1',
        price: 68000,
        change: -500,
        changeRate: -0.73,
        fetchedAt,
      });

      const result = await service.getPrice('s1');

      // getPrice always returns isCached=true when record exists
      expect(result).not.toBeNull();
      expect(result!.isCached).toBe(true);
    });

    it('캐시 데이터가 없으면 null을 반환한다', async () => {
      mockPrisma.stockPrice.findUnique.mockResolvedValue(null);

      const result = await service.getPrice('s-unknown');

      expect(result).toBeNull();
    });
  });

  describe('updatePrice', () => {
    it('주가 데이터를 upsert한다', async () => {
      const mockUpserted = {
        stockId: 's1',
        price: 70000,
        change: 1000,
        changeRate: 1.45,
        fetchedAt: new Date(),
      };
      mockPrisma.stockPrice.upsert.mockResolvedValue(mockUpserted);

      const result = await service.updatePrice('s1', 70000, 1000, 1.45);

      expect(result).toEqual(mockUpserted);
      expect(mockPrisma.stockPrice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stockId: 's1' },
          update: expect.objectContaining({ price: 70000, change: 1000, changeRate: 1.45 }),
          create: expect.objectContaining({ stockId: 's1', price: 70000 }),
        }),
      );
    });
  });

  describe('bulkUpdatePrices', () => {
    it('모두 성공하면 succeeded=전체 수, failed=0을 반환한다', async () => {
      mockPrisma.stockPrice.upsert.mockResolvedValue({});

      const result = await service.bulkUpdatePrices([
        { stockId: 's1', price: 70000, change: 500, changeRate: 0.72 },
        { stockId: 's2', price: 50000, change: -200, changeRate: -0.4 },
      ]);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('일부 실패하면 성공/실패 건수를 올바르게 반환한다', async () => {
      mockPrisma.stockPrice.upsert
        .mockResolvedValueOnce({}) // s1 성공
        .mockRejectedValueOnce(new Error('DB error')); // s2 실패

      const result = await service.bulkUpdatePrices([
        { stockId: 's1', price: 70000, change: 500, changeRate: 0.72 },
        { stockId: 's2', price: 50000, change: -200, changeRate: -0.4 },
      ]);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('모두 실패해도 rejected를 throw하지 않고 카운트만 반환한다', async () => {
      mockPrisma.stockPrice.upsert.mockRejectedValue(new Error('DB down'));

      const result = await service.bulkUpdatePrices([
        { stockId: 's1', price: 70000, change: 0, changeRate: 0 },
        { stockId: 's2', price: 50000, change: 0, changeRate: 0 },
      ]);

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  describe('getPricesForStocks', () => {
    it('stockIds 배열로 주가를 일괄 조회한다', async () => {
      const mockPrices = [
        { stockId: 's1', price: 70000, change: 500, changeRate: 0.72, fetchedAt: new Date() },
        { stockId: 's2', price: 50000, change: -200, changeRate: -0.4, fetchedAt: new Date() },
      ];
      mockPrisma.stockPrice.findMany.mockResolvedValue(mockPrices);

      const result = await service.getPricesForStocks(['s1', 's2']);

      expect(result).toEqual(mockPrices);
      expect(mockPrisma.stockPrice.findMany).toHaveBeenCalledWith({
        where: { stockId: { in: ['s1', 's2'] } },
      });
    });

    it('빈 배열을 전달하면 빈 배열을 반환한다', async () => {
      mockPrisma.stockPrice.findMany.mockResolvedValue([]);

      const result = await service.getPricesForStocks([]);

      expect(result).toEqual([]);
    });
  });
});
