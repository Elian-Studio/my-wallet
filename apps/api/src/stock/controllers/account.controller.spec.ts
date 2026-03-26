import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { StockService } from '../services/stock.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const mockStockService = {
  getAccounts: jest.fn(),
  createAccount: jest.fn(),
};

const mockReq = { user: { id: 'user-1' } };

describe('AccountController', () => {
  let controller: AccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: StockService, useValue: mockStockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountController>(AccountController);
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의된다', () => {
    expect(controller).toBeDefined();
  });

  describe('JwtAuthGuard 적용', () => {
    it('컨트롤러 클래스에 JwtAuthGuard가 적용되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', AccountController);
      expect(guards).toBeDefined();
      expect(guards.some((g: Function) => g === JwtAuthGuard)).toBe(true);
    });
  });

  describe('findAll (GET /stock-accounts)', () => {
    it('StockService.getAccounts를 userId로 호출하고 결과를 반환한다', async () => {
      const mockAccounts = [
        { id: 'acc-1', userId: 'user-1', type: 'GENERAL', broker: '키움', alias: null, isActive: true },
        { id: 'acc-2', userId: 'user-1', type: 'ISA', broker: '미래에셋', alias: '연금ISA', isActive: true },
      ];
      mockStockService.getAccounts.mockResolvedValue(mockAccounts);

      const result = await controller.findAll(mockReq);

      expect(mockStockService.getAccounts).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('create (POST /stock-accounts)', () => {
    it('StockService.createAccount를 userId와 body로 호출하고 생성된 계좌를 반환한다', async () => {
      const mockAccount = {
        id: 'acc-new',
        userId: 'user-1',
        type: 'ISA',
        broker: '미래에셋',
        alias: '연금ISA',
        isActive: true,
        createdAt: new Date(),
      };
      mockStockService.createAccount.mockResolvedValue(mockAccount);

      const body = { type: 'ISA' as const, broker: '미래에셋', alias: '연금ISA' };
      const result = await controller.create(mockReq, body);

      expect(mockStockService.createAccount).toHaveBeenCalledWith('user-1', body);
      expect(result).toEqual(mockAccount);
    });

    it('alias 없이도 계좌를 생성할 수 있다', async () => {
      const mockAccount = {
        id: 'acc-new',
        userId: 'user-1',
        type: 'GENERAL',
        broker: '키움',
        alias: undefined,
        isActive: true,
        createdAt: new Date(),
      };
      mockStockService.createAccount.mockResolvedValue(mockAccount);

      const body = { type: 'GENERAL' as const, broker: '키움' };
      const result = await controller.create(mockReq, body);

      expect(mockStockService.createAccount).toHaveBeenCalledWith('user-1', body);
      expect(result).toEqual(mockAccount);
    });
  });
});
