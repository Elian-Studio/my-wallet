import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class StockPriceService {
  private readonly logger = new Logger(StockPriceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPrice(stockId: string): Promise<{
    price: number;
    change: number;
    changeRate: number;
    fetchedAt: Date;
    isCached: boolean;
  } | null> {
    const cached = await this.prisma.stockPrice.findUnique({
      where: { stockId },
    });

    if (cached) {
      const isFresh =
        Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

      if (isFresh) {
        return {
          price: cached.price,
          change: cached.change,
          changeRate: cached.changeRate,
          fetchedAt: cached.fetchedAt,
          isCached: true,
        };
      }
    }

    return cached
      ? {
          price: cached.price,
          change: cached.change,
          changeRate: cached.changeRate,
          fetchedAt: cached.fetchedAt,
          isCached: true,
        }
      : null;
  }

  async updatePrice(
    stockId: string,
    price: number,
    change: number,
    changeRate: number,
  ) {
    return this.prisma.stockPrice.upsert({
      where: { stockId },
      update: {
        price,
        change,
        changeRate,
        fetchedAt: new Date(),
      },
      create: {
        stockId,
        price,
        change,
        changeRate,
        fetchedAt: new Date(),
      },
    });
  }

  async bulkUpdatePrices(
    updates: {
      stockId: string;
      price: number;
      change: number;
      changeRate: number;
    }[],
  ) {
    const results = await Promise.allSettled(
      updates.map((u) =>
        this.updatePrice(u.stockId, u.price, u.change, u.changeRate),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
      this.logger.warn(`주가 업데이트: 성공 ${succeeded}, 실패 ${failed}`);
    }

    return { succeeded, failed };
  }

  async getPricesForStocks(stockIds: string[]) {
    return this.prisma.stockPrice.findMany({
      where: { stockId: { in: stockIds } },
    });
  }
}
