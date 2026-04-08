import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.stock.findMany({
      where: {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      include: { stockPrices: true },
    });

    if (!stock) {
      throw new NotFoundException('종목을 찾을 수 없습니다.');
    }

    return stock;
  }

  async findByCode(code: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { code },
      include: { stockPrices: true },
    });

    if (!stock) {
      throw new NotFoundException('종목을 찾을 수 없습니다.');
    }

    return stock;
  }

  async create(data: { code: string; name: string; market?: string }) {
    const existing = await this.prisma.stock.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException('이미 등록된 종목 코드입니다.');
    }

    return this.prisma.stock.create({
      data: {
        code: data.code,
        name: data.name,
        market: data.market ?? 'KRX',
      },
    });
  }

  async getAccounts(userId: string) {
    return this.prisma.stockAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAccount(
    userId: string,
    data: { type: 'GENERAL' | 'ISA' | 'PENSION' | 'IRP'; broker: string; alias?: string },
  ) {
    return this.prisma.stockAccount.create({
      data: {
        userId,
        type: data.type,
        broker: data.broker,
        alias: data.alias,
      },
    });
  }
}
