import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StockService } from '../services/stock.service';
import { StockPriceService } from '../services/stock-price.service';

@ApiTags('Stocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly stockPriceService: StockPriceService,
  ) {}

  @Get()
  @ApiOperation({ summary: '종목 목록 조회' })
  @ApiQuery({ name: 'search', required: false, description: '종목명/코드 검색' })
  findAll(@Query('search') search?: string) {
    return this.stockService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: '종목 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Get(':id/price')
  @ApiOperation({ summary: '종목 현재가 조회 (캐시)' })
  getPrice(@Param('id') id: string) {
    return this.stockPriceService.getPrice(id);
  }

  @Post()
  @ApiOperation({ summary: '종목 등록' })
  create(@Body() data: { code: string; name: string; market?: string }) {
    return this.stockService.create(data);
  }
}
