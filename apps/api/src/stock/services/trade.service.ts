import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@my-wallet/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTradeDto } from '../dto/create-trade.dto';
import { UpdateTradeDto } from '../dto/update-trade.dto';
import { QueryTradeDto } from '../dto/query-trade.dto';
import { FifoService } from './fifo.service';
import { paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class TradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fifoService: FifoService,
  ) {}

  async create(userId: string, dto: CreateTradeDto) {
    const [stock, account] = await Promise.all([
      this.prisma.stock.findUnique({ where: { id: dto.stockId } }),
      this.prisma.stockAccount.findFirst({
        where: { id: dto.accountId, userId },
      }),
    ]);

    if (!stock) {
      throw new NotFoundException('종목을 찾을 수 없습니다.');
    }
    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다.');
    }

    if (dto.type === 'SELL') {
      const holdingQty = await this.getHoldingQuantity(
        userId,
        dto.stockId,
        dto.accountId,
      );
      if (holdingQty < dto.quantity) {
        throw new BadRequestException(
          `보유 수량(${holdingQty})보다 많은 수량(${dto.quantity})을 매도할 수 없습니다.`,
        );
      }
    }

    const trade = await this.prisma.trade.create({
      data: {
        userId,
        stockId: dto.stockId,
        accountId: dto.accountId,
        type: dto.type,
        tradeDate: new Date(dto.tradeDate),
        price: dto.price,
        quantity: dto.quantity,
        reason: dto.reason ?? [],
        memo: dto.memo,
      },
      include: { stock: true, account: true },
    });

    if (dto.type === 'SELL') {
      await this.fifoService.calculateRealizedGain(trade.id);
    }

    return trade;
  }

  async findAll(userId: string, query: QueryTradeDto) {
    const where: Prisma.TradeWhereInput = { userId };

    if (query.stockId) {
      where.stockId = query.stockId;
    }
    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate || query.endDate) {
      where.tradeDate = {};
      if (query.startDate) {
        where.tradeDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.tradeDate.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.trade.findMany({
        where,
        include: { stock: true, account: true },
        orderBy: { tradeDate: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.trade.count({ where }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async findOne(userId: string, id: string) {
    const trade = await this.prisma.trade.findFirst({
      where: { id, userId },
      include: {
        stock: true,
        account: true,
        realizedGainsAsSell: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('거래 내역을 찾을 수 없습니다.');
    }

    return trade;
  }

  async update(userId: string, id: string, dto: UpdateTradeDto) {
    const trade = await this.findOne(userId, id);

    if (trade.realizedGainsAsSell && trade.realizedGainsAsSell.length > 0) {
      throw new BadRequestException(
        'FIFO 정산이 완료된 매도 거래는 수정할 수 없습니다.',
      );
    }

    return this.prisma.trade.update({
      where: { id },
      data: {
        ...(dto.tradeDate && { tradeDate: new Date(dto.tradeDate) }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      include: { stock: true, account: true },
    });
  }

  async remove(userId: string, id: string) {
    const trade = await this.findOne(userId, id);

    const hasRealizedGains = await this.prisma.realizedGain.count({
      where: {
        OR: [{ buyTradeId: id }, { sellTradeId: id }],
      },
    });

    if (hasRealizedGains > 0) {
      throw new BadRequestException(
        'FIFO 정산 이력이 있는 거래는 삭제할 수 없습니다. 관련 매도 거래를 먼저 삭제하세요.',
      );
    }

    await this.prisma.trade.delete({ where: { id: trade.id } });
    return { deleted: true };
  }

  private async getHoldingQuantity(
    userId: string,
    stockId: string,
    accountId: string,
  ): Promise<number> {
    const result = await this.prisma.trade.groupBy({
      by: ['type'],
      where: { userId, stockId, accountId },
      _sum: { quantity: true },
    });

    const buyQty =
      result.find((r) => r.type === 'BUY')?._sum.quantity ?? 0;
    const sellQty =
      result.find((r) => r.type === 'SELL')?._sum.quantity ?? 0;

    return buyQty - sellQty;
  }
}
