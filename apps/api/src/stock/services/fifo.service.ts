import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FifoService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateRealizedGain(sellTradeId: string): Promise<void> {
    const sellTrade = await this.prisma.trade.findUnique({
      where: { id: sellTradeId },
    });

    if (!sellTrade || sellTrade.type !== 'SELL') {
      throw new BadRequestException('유효한 매도 거래가 아닙니다.');
    }

    const buyTrades = await this.prisma.trade.findMany({
      where: {
        userId: sellTrade.userId,
        stockId: sellTrade.stockId,
        accountId: sellTrade.accountId,
        type: 'BUY',
        tradeDate: { lte: sellTrade.tradeDate },
      },
      orderBy: { tradeDate: 'asc' },
    });

    const existingGains = await this.prisma.realizedGain.findMany({
      where: {
        buyTradeId: { in: buyTrades.map((t) => t.id) },
      },
    });

    const usedQuantityByBuy = new Map<string, number>();
    for (const gain of existingGains) {
      const current = usedQuantityByBuy.get(gain.buyTradeId) ?? 0;
      usedQuantityByBuy.set(gain.buyTradeId, current + gain.quantity);
    }

    let remainingToSell = sellTrade.quantity;
    const gainRecords: {
      buyTradeId: string;
      sellTradeId: string;
      quantity: number;
      buyPrice: number;
      sellPrice: number;
      gain: number;
    }[] = [];

    for (const buyTrade of buyTrades) {
      if (remainingToSell <= 0) break;

      const usedQty = usedQuantityByBuy.get(buyTrade.id) ?? 0;
      const availableQty = buyTrade.quantity - usedQty;

      if (availableQty <= 0) continue;

      const matchQty = Math.min(availableQty, remainingToSell);
      const gain = (sellTrade.price - buyTrade.price) * matchQty;

      gainRecords.push({
        buyTradeId: buyTrade.id,
        sellTradeId: sellTrade.id,
        quantity: matchQty,
        buyPrice: buyTrade.price,
        sellPrice: sellTrade.price,
        gain,
      });

      remainingToSell -= matchQty;
    }

    if (remainingToSell > 0) {
      throw new BadRequestException(
        `FIFO 매칭 실패: 매도 수량(${sellTrade.quantity}) 중 ${remainingToSell}주에 대한 매수 내역이 부족합니다.`,
      );
    }

    if (gainRecords.length > 0) {
      await this.prisma.realizedGain.createMany({
        data: gainRecords,
      });
    }
  }

  async getRealizedGainsByTrade(sellTradeId: string) {
    return this.prisma.realizedGain.findMany({
      where: { sellTradeId },
      include: {
        buyTrade: { include: { stock: true } },
      },
      orderBy: { buyTrade: { tradeDate: 'asc' } },
    });
  }

  async getTotalRealizedGain(
    userId: string,
    stockId?: string,
    accountId?: string,
  ): Promise<number> {
    const where: Record<string, unknown> = {
      sellTrade: { userId },
    };

    if (stockId) {
      (where.sellTrade as Record<string, unknown>).stockId = stockId;
    }
    if (accountId) {
      (where.sellTrade as Record<string, unknown>).accountId = accountId;
    }

    const result = await this.prisma.realizedGain.aggregate({
      where,
      _sum: { gain: true },
    });

    return result._sum.gain ?? 0;
  }
}
