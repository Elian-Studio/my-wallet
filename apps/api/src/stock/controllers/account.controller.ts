import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StockService } from '../services/stock.service';

@ApiTags('Stock Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-accounts')
export class AccountController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: '증권 계좌 목록 조회' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.stockService.getAccounts(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: '증권 계좌 등록' })
  create(
    @Request() req: { user: { id: string } },
    @Body()
    data: {
      type: 'GENERAL' | 'ISA' | 'PENSION' | 'IRP';
      broker: string;
      alias?: string;
    },
  ) {
    return this.stockService.createAccount(req.user.id, data);
  }
}
