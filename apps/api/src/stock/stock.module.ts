import { Module } from '@nestjs/common';
import { TradeController } from './controllers/trade.controller';
import { StockController } from './controllers/stock.controller';
import { AccountController } from './controllers/account.controller';
import { PortfolioController } from './controllers/portfolio.controller';
import { TradeService } from './services/trade.service';
import { StockService } from './services/stock.service';
import { PortfolioService } from './services/portfolio.service';
import { FifoService } from './services/fifo.service';
import { StockPriceService } from './services/stock-price.service';

@Module({
  controllers: [
    TradeController,
    StockController,
    AccountController,
    PortfolioController,
  ],
  providers: [
    TradeService,
    StockService,
    PortfolioService,
    FifoService,
    StockPriceService,
  ],
  exports: [
    TradeService,
    StockService,
    PortfolioService,
    FifoService,
    StockPriceService,
  ],
})
export class StockModule {}
