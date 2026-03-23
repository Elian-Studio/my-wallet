import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@my-wallet/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { QueryTransactionDto } from '../dto/query-transaction.dto';
import { paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        type: dto.type,
        title: dto.title,
        amount: dto.amount,
        date: new Date(dto.date),
        isFixed: dto.isFixed ?? false,
        memo: dto.memo,
      },
      include: { category: true },
    });
  }

  async findAll(userId: string, query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('거래 내역을 찾을 수 없습니다.');
    }

    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('카테고리를 찾을 수 없습니다.');
      }
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.type && { type: dto.type }),
        ...(dto.title && { title: dto.title }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.isFixed !== undefined && { isFixed: dto.isFixed }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    return { deleted: true };
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getMonthlySummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSaving = transactions
      .filter((t) => t.type === 'SAVING')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      totalIncome,
      totalExpense,
      totalSaving,
      balance: totalIncome - totalExpense - totalSaving,
    };
  }
}
