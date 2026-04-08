import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { QueryTransactionDto } from '../dto/query-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: '거래 내역 생성' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '거래 내역 목록 조회' })
  findAll(
    @Request() req: { user: { id: string } },
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.findAll(req.user.id, query);
  }

  @Get('categories')
  @ApiOperation({ summary: '카테고리 목록 조회' })
  getCategories() {
    return this.transactionService.getCategories();
  }

  @Get('summary/:year/:month')
  @ApiOperation({ summary: '월별 요약 조회' })
  getMonthlySummary(
    @Request() req: { user: { id: string } },
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.transactionService.getMonthlySummary(req.user.id, year, month);
  }

  @Get('breakdown/:year/:month')
  @ApiOperation({ summary: '월별 카테고리별 지출/수입/저축 집계' })
  getCategoryBreakdown(
    @Request() req: { user: { id: string } },
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.transactionService.getCategoryBreakdown(req.user.id, year, month);
  }

  @Get(':id')
  @ApiOperation({ summary: '거래 내역 상세 조회' })
  findOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.transactionService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: '거래 내역 수정' })
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '거래 내역 삭제' })
  remove(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.transactionService.remove(req.user.id, id);
  }
}
