import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  HoldingItem,
  PortfolioSummary,
  PerformanceItem,
} from '@my-wallet/shared';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getHoldings(userId: string, accountId?: string): Promise<HoldingItem[]> {
    const tradeWhere: Record<string, unknown> = { userId };
    if (accountId) {
      tradeWhere.accountId = accountId;
    }

    const trades = await this.prisma.trade.findMany({
      where: tradeWhere,
      include: { stock: { include: { stockPrices: true } } },
      orderBy: { tradeDate: 'asc' },
    });

    const holdingsMap = new Map<
      string,
      {
        stock: { id: string; name: string; code: string };
        buyQuantity: number;
        sellQuantity: number;
        totalBuyCost: number;
        currentPrice: number;
      }
    >();

    for (const trade of trades) {
      const key = trade.stockId;
      if (!holdingsMap.has(key)) {
        const latestPrice = trade.stock.stockPrices[0];
        holdingsMap.set(key, {
          stock: {
            id: trade.stock.id,
            name: trade.stock.name,
            code: trade.stock.code,
          },
          buyQuantity: 0,
          sellQuantity: 0,
          totalBuyCost: 0,
          currentPrice: latestPrice?.price ?? 0,
        });
      }

      const holding = holdingsMap.get(key)!;
      if (trade.type === 'BUY') {
        holding.buyQuantity += trade.quantity;
        holding.totalBuyCost += trade.price * trade.quantity;
      } else {
        holding.sellQuantity += trade.quantity;
      }
    }

    const realizedGains = await this.prisma.realizedGain.findMany({
      where: { sellTrade: { userId, ...(accountId && { accountId }) } },
    });

    const soldCostByStock = new Map<string, number>();
    for (const gain of realizedGains) {
      const buyTrade = trades.find((t) => t.id === gain.buyTradeId);
      if (buyTrade) {
        const current = soldCostByStock.get(buyTrade.stockId) ?? 0;
        soldCostByStock.set(
          buyTrade.stockId,
          current + gain.buyPrice * gain.quantity,
        );
      }
    }

    const holdings: HoldingItem[] = [];
    let totalEvaluation = 0;

    for (const [stockId, data] of holdingsMap) {
      const quantity = data.buyQuantity - data.sellQuantity;
      if (quantity <= 0) continue;

      // 가중평균 매수가 = 총 매수금액 / 총 매수수량 (매도와 무관하게 일정)
      const avgBuyPrice = data.buyQuantity > 0 ? Math.round(data.totalBuyCost / data.buyQuantity) : 0;
      const evaluation = data.currentPrice * quantity;
      const invested = avgBuyPrice * quantity;
      const unrealizedGain = evaluation - invested;
      const unrealizedGainRate =
        invested > 0 ? Math.round((unrealizedGain / invested) * 10000) / 100 : 0;

      holdings.push({
        stockId: data.stock.id,
        stockName: data.stock.name,
        stockCode: data.stock.code,
        quantity,
        avgBuyPrice,
        currentPrice: data.currentPrice,
        evaluation,
        invested,
        unrealizedGain,
        unrealizedGainRate,
        weight: 0,
      });

      totalEvaluation += evaluation;
    }

    for (const holding of holdings) {
      holding.weight =
        totalEvaluation > 0
          ? Math.round((holding.evaluation / totalEvaluation) * 10000) / 100
          : 0;
    }

    return holdings.sort((a, b) => b.evaluation - a.evaluation);
  }

  async getSummary(userId: string, accountId?: string): Promise<PortfolioSummary> {
    const holdings = await this.getHoldings(userId, accountId);

    const totalEvaluation = holdings.reduce((sum, h) => sum + h.evaluation, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
    const totalUnrealizedGain = totalEvaluation - totalInvested;
    const totalUnrealizedGainRate =
      totalInvested > 0
        ? Math.round((totalUnrealizedGain / totalInvested) * 10000) / 100
        : 0;

    const realizedResult = await this.prisma.realizedGain.aggregate({
      where: { sellTrade: { userId, ...(accountId && { accountId }) } },
      _sum: { gain: true },
    });
    const totalRealizedGain = realizedResult._sum.gain ?? 0;

    return {
      totalEvaluation,
      totalInvested,
      totalUnrealizedGain,
      totalUnrealizedGainRate,
      totalRealizedGain,
    };
  }

  async getPerformance(
    userId: string,
    year: number,
    accountId?: string,
  ): Promise<PerformanceItem[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const gains = await this.prisma.realizedGain.findMany({
      where: {
        sellTrade: {
          userId,
          tradeDate: { gte: startDate, lte: endDate },
          ...(accountId && { accountId }),
        },
      },
      include: { sellTrade: true },
    });

    const monthlyMap = new Map<string, { gain: number; tradeIds: Set<string> }>();

    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { gain: 0, tradeIds: new Set() });
    }

    for (const gain of gains) {
      const tradeDate = gain.sellTrade.tradeDate;
      const month = tradeDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.gain += gain.gain;
        entry.tradeIds.add(gain.sellTradeId);
      }
    }

    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      realizedGain: data.gain,
      tradeCount: data.tradeIds.size,
    }));
  }
}
