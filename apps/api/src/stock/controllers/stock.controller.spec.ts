import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from '../services/stock.service';
import { StockPriceService } from '../services/stock-price.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const mockStockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockStockPriceService = {
  getPrice: jest.fn(),
};

const mockStock = {
  id: 's1',
  code: 'KRX001',
  name: '삼성전자',
  market: 'KRX',
  isActive: true,
};

describe('StockController', () => {
  let controller: StockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        { provide: StockService, useValue: mockStockService },
        { provide: StockPriceService, useValue: mockStockPriceService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StockController>(StockController);
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의된다', () => {
    expect(controller).toBeDefined();
  });

  describe('JwtAuthGuard 적용', () => {
    it('컨트롤러 클래스에 JwtAuthGuard가 적용되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', StockController);
      expect(guards).toBeDefined();
      expect(guards.some((g: Function) => g === JwtAuthGuard)).toBe(true);
    });
  });

  describe('findAll (GET /stocks)', () => {
    it('StockService.findAll을 검색어 없이 호출한다', async () => {
      mockStockService.findAll.mockResolvedValue([mockStock]);

      const result = await controller.findAll(undefined);

      expect(mockStockService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockStock]);
    });

    it('검색어를 전달하면 StockService.findAll에 검색어를 넘긴다', async () => {
      mockStockService.findAll.mockResolvedValue([mockStock]);

      const result = await controller.findAll('삼성');

      expect(mockStockService.findAll).toHaveBeenCalledWith('삼성');
      expect(result).toEqual([mockStock]);
    });
  });

  describe('findOne (GET /stocks/:id)', () => {
    it('StockService.findOne을 id로 호출한다', async () => {
      const stockWithPrices = { ...mockStock, stockPrices: [] };
      mockStockService.findOne.mockResolvedValue(stockWithPrices);

      const result = await controller.findOne('s1');

      expect(mockStockService.findOne).toHaveBeenCalledWith('s1');
      expect(result).toEqual(stockWithPrices);
    });
  });

  describe('getPrice (GET /stocks/:id/price)', () => {
    it('StockPriceService.getPrice를 stockId로 호출한다', async () => {
      const mockPrice = {
        price: 70000,
        change: 500,
        changeRate: 0.72,
        fetchedAt: new Date(),
        isCached: true,
      };
      mockStockPriceService.getPrice.mockResolvedValue(mockPrice);

      const result = await controller.getPrice('s1');

      expect(mockStockPriceService.getPrice).toHaveBeenCalledWith('s1');
      expect(result).toEqual(mockPrice);
    });
  });

  describe('create (POST /stocks)', () => {
    it('StockService.create를 body 데이터로 호출한다', async () => {
      mockStockService.create.mockResolvedValue(mockStock);

      const body = { code: 'KRX001', name: '삼성전자', market: 'KRX' };
      const result = await controller.create(body);

      expect(mockStockService.create).toHaveBeenCalledWith(body);
      expect(result).toEqual(mockStock);
    });
  });
});
