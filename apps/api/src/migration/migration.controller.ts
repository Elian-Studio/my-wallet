import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MigrationService } from './migration.service';
import { ImportTransactionsDto } from './dto/import-transactions.dto';
import { ImportBudgetsDto } from './dto/import-budgets.dto';
import { ImportTradesDto } from './dto/import-trades.dto';

@ApiTags('Migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('migration/notion')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Notion 거래 내역 일괄 가져오기' })
  importTransactions(
    @Request() req: { user: { id: string } },
    @Body() dto: ImportTransactionsDto,
  ) {
    return this.migrationService.importTransactions(req.user.id, dto);
  }

  @Post('budgets')
  @ApiOperation({ summary: 'Notion 예산 일괄 가져오기' })
  importBudgets(
    @Request() req: { user: { id: string } },
    @Body() dto: ImportBudgetsDto,
  ) {
    return this.migrationService.importBudgets(req.user.id, dto);
  }

  @Post('trades')
  @ApiOperation({ summary: 'Notion 주식 거래 일괄 가져오기' })
  importTrades(
    @Request() req: { user: { id: string } },
    @Body() dto: ImportTradesDto,
  ) {
    return this.migrationService.importTrades(req.user.id, dto);
  }
}
