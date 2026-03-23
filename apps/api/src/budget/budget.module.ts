import { Module } from '@nestjs/common';
import { TransactionController } from './controllers/transaction.controller';
import { BudgetController } from './controllers/budget.controller';
import { CategoryController } from './controllers/category.controller';
import { TransactionService } from './services/transaction.service';
import { BudgetService } from './services/budget.service';
import { BudgetAnalysisService } from './services/budget-analysis.service';

@Module({
  controllers: [TransactionController, BudgetController, CategoryController],
  providers: [TransactionService, BudgetService, BudgetAnalysisService],
  exports: [TransactionService, BudgetService, BudgetAnalysisService],
})
export class BudgetModule {}
