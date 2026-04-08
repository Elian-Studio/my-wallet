import { Test, TestingModule } from '@nestjs/testing';
import { TradeController } from './trade.controller';
import { TradeService } from '../services/trade.service';
import { FifoService } from '../services/fifo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTradeDto } from '../dto/create-trade.dto';
import { UpdateTradeDto } from '../dto/update-trade.dto';
import { QueryTradeDto } from '../dto/query-trade.dto';

const mockTradeService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockFifoService = {
  calculateRealizedGain: jest.fn(),
  getRealizedGainsByTrade: jest.fn(),
  getTotalRealizedGain: jest.fn(),
};

const mockReq = { user: { id: 'user-001' } };
const TRADE_ID = 'trade-001';

describe('TradeController', () => {
  let controller: TradeController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradeController],
      providers: [
        { provide: TradeService, useValue: mockTradeService },
        { provide: FifoService, useValue: mockFifoService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TradeController>(TradeController);
  });

  it('컨트롤러가 정의된다', () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  describe('JwtAuthGuard 적용', () => {
    it('컨트롤러 클래스에 JwtAuthGuard가 적용되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', TradeController);
      expect(guards).toBeDefined();
      expect(guards.some((g: Function) => g === JwtAuthGuard)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  describe('create (POST /trades)', () => {
    it('TradeService.create를 userId와 dto로 호출하고 결과를 반환한다', async () => {
      const dto: CreateTradeDto = {
        stockId: 'stock-001',
        accountId: 'acc-001',
        type: 'BUY',
        tradeDate: '2026-01-15',
        price: 50000,
        quantity: 10,
      };
      const expected = { id: TRADE_ID, ...dto };
      mockTradeService.create.mockResolvedValue(expected);

      const result = await controller.create(mockReq, dto);

      expect(mockTradeService.create).toHaveBeenCalledWith('user-001', dto);
      expect(result).toEqual(expected);
    });
  });

  // ──────────────────────────────────────────────
  describe('findAll (GET /trades)', () => {
    it('TradeService.findAll을 userId와 query로 호출하고 결과를 반환한다', async () => {
      const query = new QueryTradeDto();
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockTradeService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockReq, query);

      expect(mockTradeService.findAll).toHaveBeenCalledWith('user-001', query);
      expect(result).toEqual(expected);
    });
  });

  // ──────────────────────────────────────────────
  describe('findOne (GET /trades/:id)', () => {
    it('TradeService.findOne을 userId와 id로 호출하고 결과를 반환한다', async () => {
      const expected = { id: TRADE_ID, type: 'BUY' };
      mockTradeService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(mockReq, TRADE_ID);

      expect(mockTradeService.findOne).toHaveBeenCalledWith('user-001', TRADE_ID);
      expect(result).toEqual(expected);
    });
  });

  // ──────────────────────────────────────────────
  describe('getRealizedGains (GET /trades/:id/realized-gains)', () => {
    it('FifoService.getRealizedGainsByTrade를 tradeId로 호출하고 결과를 반환한다', async () => {
      const gains = [{ id: 'rg-001', gain: 100000 }];
      mockFifoService.getRealizedGainsByTrade.mockResolvedValue(gains);

      const result = await controller.getRealizedGains(TRADE_ID);

      expect(mockFifoService.getRealizedGainsByTrade).toHaveBeenCalledWith(
        TRADE_ID,
      );
      expect(result).toEqual(gains);
    });
  });

  // ──────────────────────────────────────────────
  describe('update (PUT /trades/:id)', () => {
    it('TradeService.update를 userId, id, dto로 호출하고 결과를 반환한다', async () => {
      const dto: UpdateTradeDto = { price: 55000 };
      const expected = { id: TRADE_ID, price: 55000 };
      mockTradeService.update.mockResolvedValue(expected);

      const result = await controller.update(mockReq, TRADE_ID, dto);

      expect(mockTradeService.update).toHaveBeenCalledWith(
        'user-001',
        TRADE_ID,
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  // ──────────────────────────────────────────────
  describe('remove (DELETE /trades/:id)', () => {
    it('TradeService.remove를 userId와 id로 호출하고 결과를 반환한다', async () => {
      const expected = { deleted: true };
      mockTradeService.remove.mockResolvedValue(expected);

      const result = await controller.remove(mockReq, TRADE_ID);

      expect(mockTradeService.remove).toHaveBeenCalledWith('user-001', TRADE_ID);
      expect(result).toEqual(expected);
    });
  });
});
