import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortfolioService } from '../services/portfolio.service';

@ApiTags('Portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  @ApiOperation({ summary: '포트폴리오 종합 요약' })
  @ApiQuery({ name: 'accountId', required: false, description: '계좌 ID 필터' })
  getSummary(
    @Request() req: { user: { id: string } },
    @Query('accountId') accountId?: string,
  ) {
    return this.portfolioService.getSummary(req.user.id, accountId);
  }

  @Get('holdings')
  @ApiOperation({ summary: '보유 종목 현황' })
  @ApiQuery({ name: 'accountId', required: false, description: '계좌 ID 필터' })
  getHoldings(
    @Request() req: { user: { id: string } },
    @Query('accountId') accountId?: string,
  ) {
    return this.portfolioService.getHoldings(req.user.id, accountId);
  }

  @Get('performance')
  @ApiOperation({ summary: '연간 월별 실현이익 추이' })
  @ApiQuery({ name: 'year', type: Number, example: 2026 })
  @ApiQuery({ name: 'accountId', required: false, description: '계좌 ID 필터' })
  getPerformance(
    @Request() req: { user: { id: string } },
    @Query('year') year: number,
    @Query('accountId') accountId?: string,
  ) {
    return this.portfolioService.getPerformance(req.user.id, year, accountId);
  }
}
