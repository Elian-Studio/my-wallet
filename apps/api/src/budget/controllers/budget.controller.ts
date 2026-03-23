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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BudgetService } from '../services/budget.service';
import { BudgetAnalysisService } from '../services/budget-analysis.service';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/create-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly budgetAnalysisService: BudgetAnalysisService,
  ) {}

  @Post()
  @ApiOperation({ summary: '예산 생성' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '월별 예산 목록 조회' })
  @ApiQuery({ name: 'year', type: Number, example: 2026 })
  @ApiQuery({ name: 'month', type: Number, example: 3 })
  findByMonth(
    @Request() req: { user: { id: string } },
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.budgetService.findByMonth(req.user.id, year, month);
  }

  @Get('analysis')
  @ApiOperation({ summary: '예산 대비 실적 분석' })
  @ApiQuery({ name: 'year', type: Number, example: 2026 })
  @ApiQuery({ name: 'month', type: Number, example: 3 })
  getAnalysis(
    @Request() req: { user: { id: string } },
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.budgetAnalysisService.analyze(req.user.id, year, month);
  }

  @Get(':id')
  @ApiOperation({ summary: '예산 상세 조회' })
  findOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.budgetService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: '예산 수정' })
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '예산 삭제' })
  remove(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.budgetService.remove(req.user.id, id);
  }
}
