import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/create-budget.dto';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBudgetDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    const monthDate = new Date(dto.month);
    monthDate.setDate(1);

    const existing = await this.prisma.budget.findUnique({
      where: {
        userId_categoryId_month: {
          userId,
          categoryId: dto.categoryId,
          month: monthDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        '해당 월에 이미 동일 카테고리의 예산이 존재합니다.',
      );
    }

    return this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        type: dto.type,
        month: monthDate,
        amount: dto.amount,
      },
      include: { category: true },
    });
  }

  async findByMonth(userId: string, year: number, month: number) {
    const monthDate = new Date(year, month - 1, 1);

    return this.prisma.budget.findMany({
      where: { userId, month: monthDate },
      include: { category: true },
      orderBy: { category: { sortOrder: 'asc' } },
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!budget) {
      throw new NotFoundException('예산을 찾을 수 없습니다.');
    }

    return budget;
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, id);

    return this.prisma.budget.update({
      where: { id },
      data: { amount: dto.amount },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.budget.delete({ where: { id } });
    return { deleted: true };
  }
}
