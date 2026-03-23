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
import { TradeService } from '../services/trade.service';
import { FifoService } from '../services/fifo.service';
import { CreateTradeDto } from '../dto/create-trade.dto';
import { UpdateTradeDto } from '../dto/update-trade.dto';
import { QueryTradeDto } from '../dto/query-trade.dto';

@ApiTags('Trades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trades')
export class TradeController {
  constructor(
    private readonly tradeService: TradeService,
    private readonly fifoService: FifoService,
  ) {}

  @Post()
  @ApiOperation({ summary: '매매 기록 생성 (SELL시 FIFO 자동 실행)' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateTradeDto,
  ) {
    return this.tradeService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '매매 기록 목록 조회' })
  findAll(
    @Request() req: { user: { id: string } },
    @Query() query: QueryTradeDto,
  ) {
    return this.tradeService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '매매 기록 상세 조회' })
  findOne(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.tradeService.findOne(req.user.id, id);
  }

  @Get(':id/realized-gains')
  @ApiOperation({ summary: '매도 거래의 FIFO 실현이익 상세' })
  getRealizedGains(@Param('id') id: string) {
    return this.fifoService.getRealizedGainsByTrade(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '매매 기록 수정' })
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTradeDto,
  ) {
    return this.tradeService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '매매 기록 삭제' })
  remove(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.tradeService.remove(req.user.id, id);
  }
}
