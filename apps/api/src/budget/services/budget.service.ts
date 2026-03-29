import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/create-budget.dto';
import { ApplyAllPreviewDto, ApplyAllBudgetDto } from '../dto/apply-all-budget.dto';

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
    const monthDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);

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

  async previewApplyAll(userId: string, dto: ApplyAllPreviewDto) {
    const { sourceYear, sourceMonth, targetYear } = dto;

    const sourceDate = new Date(
      `${sourceYear}-${String(sourceMonth).padStart(2, '0')}-01`,
    );
    const sourceBudgets = await this.prisma.budget.findMany({
      where: { userId, month: sourceDate },
      include: { category: true },
      orderBy: { category: { sortOrder: 'asc' } },
    });

    const months: Array<{
      month: number;
      status: 'new' | 'conflict' | 'same';
      existing: typeof sourceBudgets;
    }> = [];

    for (let m = 1; m <= 12; m++) {
      const monthDate = new Date(
        `${targetYear}-${String(m).padStart(2, '0')}-01`,
      );
      const existing = await this.prisma.budget.findMany({
        where: { userId, month: monthDate },
        include: { category: true },
        orderBy: { category: { sortOrder: 'asc' } },
      });

      let status: 'new' | 'conflict' | 'same';

      if (existing.length === 0) {
        status = 'new';
      } else {
        // Compare each source budget against existing
        const isSame =
          sourceBudgets.length === existing.length &&
          sourceBudgets.every((sb) => {
            const match = existing.find((eb) => eb.categoryId === sb.categoryId);
            return match && Number(match.amount) === Number(sb.amount);
          });
        status = isSame ? 'same' : 'conflict';
      }

      months.push({ month: m, status, existing });
    }

    return {
      source: { year: sourceYear, month: sourceMonth, budgets: sourceBudgets },
      months,
    };
  }

  async applyAll(userId: string, dto: ApplyAllBudgetDto) {
    const { sourceYear, sourceMonth, targetYear, selectedMonths, conflictMode } = dto;

    const sourceDate = new Date(
      `${sourceYear}-${String(sourceMonth).padStart(2, '0')}-01`,
    );
    const sourceBudgets = await this.prisma.budget.findMany({
      where: { userId, month: sourceDate },
      include: { category: true },
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const m of selectedMonths) {
        const monthDate = new Date(
          `${targetYear}-${String(m).padStart(2, '0')}-01`,
        );

        for (const sourceBudget of sourceBudgets) {
          const existing = await tx.budget.findUnique({
            where: {
              userId_categoryId_month: {
                userId,
                categoryId: sourceBudget.categoryId,
                month: monthDate,
              },
            },
          });

          if (!existing) {
            await tx.budget.create({
              data: {
                userId,
                categoryId: sourceBudget.categoryId,
                type: sourceBudget.type,
                month: monthDate,
                amount: sourceBudget.amount,
              },
            });
            created++;
          } else if (conflictMode === 'overwrite') {
            await tx.budget.update({
              where: { id: existing.id },
              data: { amount: sourceBudget.amount },
            });
            updated++;
          } else {
            // conflictMode === 'skip'
            skipped++;
          }
        }
      }
    });

    return { created, updated, skipped };
  }
}
