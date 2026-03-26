import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FifoService } from '../stock/services/fifo.service';
import { ImportTransactionsDto } from './dto/import-transactions.dto';
import { ImportBudgetsDto } from './dto/import-budgets.dto';
import { ImportTradesDto } from './dto/import-trades.dto';

export interface MigrationResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface TradesMigrationResult extends MigrationResult {
  totalBuyAmount: number;
  totalSellAmount: number;
}

@Injectable()
export class MigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fifoService: FifoService,
  ) {}

  async importTransactions(
    userId: string,
    dto: ImportTransactionsDto,
  ): Promise<MigrationResult> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const createDataList: {
      userId: string;
      categoryId: string;
      type: 'INCOME' | 'EXPENSE' | 'SAVING';
      title: string;
      amount: number;
      date: Date;
      isFixed: boolean;
      memo?: string | null;
    }[] = [];

    for (const item of dto.items) {
      try {
        const category = await this.prisma.category.findFirst({
          where: { name: item.categoryName, type: item.type },
        });

        if (!category) {
          skipped++;
          errors.push(
            `카테고리를 찾을 수 없습니다: name="${item.categoryName}", type="${item.type}"`,
          );
          continue;
        }

        createDataList.push({
          userId,
          categoryId: category.id,
          type: item.type,
          title: item.title,
          amount: item.amount,
          date: new Date(item.date),
          isFixed: item.isFixed ?? false,
          memo: item.memo ?? null,
        });
      } catch (err) {
        skipped++;
        errors.push(
          `거래 처리 중 오류: title="${item.title}", error=${(err as Error).message}`,
        );
      }
    }

    if (createDataList.length > 0) {
      const result = await this.prisma.transaction.createMany({
        data: createDataList,
      });
      imported = result.count;
    }

    return { imported, skipped, errors };
  }

  async importBudgets(
    userId: string,
    dto: ImportBudgetsDto,
  ): Promise<MigrationResult> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of dto.items) {
      try {
        const category = await this.prisma.category.findFirst({
          where: { name: item.categoryName, type: item.type },
        });

        if (!category) {
          skipped++;
          errors.push(
            `카테고리를 찾을 수 없습니다: name="${item.categoryName}", type="${item.type}"`,
          );
          continue;
        }

        await this.prisma.budget.upsert({
          where: {
            userId_categoryId_month: {
              userId,
              categoryId: category.id,
              month: new Date(item.month),
            },
          },
          update: {
            amount: item.amount,
            type: item.type,
          },
          create: {
            userId,
            categoryId: category.id,
            type: item.type,
            month: new Date(item.month),
            amount: item.amount,
          },
        });

        imported++;
      } catch (err) {
        skipped++;
        errors.push(
          `예산 처리 중 오류: category="${item.categoryName}", month="${item.month}", error=${(err as Error).message}`,
        );
      }
    }

    return { imported, skipped, errors };
  }

  async importTrades(
    userId: string,
    dto: ImportTradesDto,
  ): Promise<TradesMigrationResult> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    let totalBuyAmount = 0;
    let totalSellAmount = 0;

    // Sort by tradeDate ASC for correct FIFO processing
    const sortedItems = [...dto.items].sort(
      (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime(),
    );

    for (const item of sortedItems) {
      try {
        const stock = await this.prisma.stock.findUnique({
          where: { code: item.stockCode },
        });

        if (!stock) {
          skipped++;
          errors.push(`종목을 찾을 수 없습니다: code="${item.stockCode}"`);
          continue;
        }

        const account = await this.prisma.stockAccount.findFirst({
          where: {
            userId,
            broker: item.accountBroker,
            type: item.accountType,
          },
        });

        if (!account) {
          skipped++;
          errors.push(
            `계좌를 찾을 수 없습니다: broker="${item.accountBroker}", type="${item.accountType}"`,
          );
          continue;
        }

        const trade = await this.prisma.trade.create({
          data: {
            userId,
            stockId: stock.id,
            accountId: account.id,
            type: item.type,
            tradeDate: new Date(item.tradeDate),
            price: item.price,
            quantity: item.quantity,
            reason: item.reason ?? [],
            memo: item.memo ?? null,
          },
        });

        if (item.type === 'BUY') {
          totalBuyAmount += item.price * item.quantity;
        } else if (item.type === 'SELL') {
          totalSellAmount += item.price * item.quantity;
          try {
            await this.fifoService.calculateRealizedGain(trade.id);
          } catch (fifoErr) {
            errors.push(
              `FIFO 계산 오류: tradeDate="${item.tradeDate}", stock="${item.stockCode}", error=${(fifoErr as Error).message}`,
            );
          }
        }

        imported++;
      } catch (err) {
        skipped++;
        errors.push(
          `거래 처리 중 오류: stock="${item.stockCode}", date="${item.tradeDate}", error=${(err as Error).message}`,
        );
      }
    }

    return { imported, skipped, errors, totalBuyAmount, totalSellAmount };
  }
}
