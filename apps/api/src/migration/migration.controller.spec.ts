import { Test, TestingModule } from '@nestjs/testing';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const USER_ID = 'user-001';
const mockReq = { user: { id: USER_ID } };

const mockMigrationService = {
  importTransactions: jest.fn(),
  importBudgets: jest.fn(),
  importTrades: jest.fn(),
};

describe('MigrationController', () => {
  let controller: MigrationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MigrationController],
      providers: [
        { provide: MigrationService, useValue: mockMigrationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MigrationController>(MigrationController);
  });

  describe('POST /migration/notion/transactions', () => {
    it('importTransactions 서비스를 호출하고 결과를 반환한다', async () => {
      const dto = {
        items: [
          {
            categoryName: '식비',
            type: 'EXPENSE' as const,
            title: '점심식사',
            amount: 12000,
            date: '2026-03-15',
          },
        ],
      };

      const mockResult = { imported: 1, skipped: 0, errors: [] };
      mockMigrationService.importTransactions.mockResolvedValue(mockResult);

      const result = await controller.importTransactions(mockReq, dto);

      expect(mockMigrationService.importTransactions).toHaveBeenCalledWith(USER_ID, dto);
      expect(result).toEqual(mockResult);
    });

    it('일부 항목이 건너뛰어진 결과를 반환한다', async () => {
      const dto = {
        items: [
          {
            categoryName: '없는카테고리',
            type: 'EXPENSE' as const,
            title: '테스트',
            amount: 1000,
            date: '2026-03-15',
          },
        ],
      };

      const mockResult = {
        imported: 0,
        skipped: 1,
        errors: ['카테고리를 찾을 수 없습니다: name="없는카테고리", type="EXPENSE"'],
      };
      mockMigrationService.importTransactions.mockResolvedValue(mockResult);

      const result = await controller.importTransactions(mockReq, dto);

      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /migration/notion/budgets', () => {
    it('importBudgets 서비스를 호출하고 결과를 반환한다', async () => {
      const dto = {
        items: [
          {
            categoryName: '식비',
            type: 'EXPENSE' as const,
            month: '2026-03-01',
            amount: 300000,
          },
        ],
      };

      const mockResult = { imported: 1, skipped: 0, errors: [] };
      mockMigrationService.importBudgets.mockResolvedValue(mockResult);

      const result = await controller.importBudgets(mockReq, dto);

      expect(mockMigrationService.importBudgets).toHaveBeenCalledWith(USER_ID, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /migration/notion/trades', () => {
    it('importTrades 서비스를 호출하고 결과를 반환한다', async () => {
      const dto = {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL' as const,
            type: 'BUY' as const,
            tradeDate: '2026-01-10',
            price: 70000,
            quantity: 10,
          },
        ],
      };

      const mockResult = {
        imported: 1,
        skipped: 0,
        errors: [],
        totalBuyAmount: 700000,
        totalSellAmount: 0,
      };
      mockMigrationService.importTrades.mockResolvedValue(mockResult);

      const result = await controller.importTrades(mockReq, dto);

      expect(mockMigrationService.importTrades).toHaveBeenCalledWith(USER_ID, dto);
      expect(result).toEqual(mockResult);
    });

    it('SELL 거래의 총 매도 금액을 포함한 결과를 반환한다', async () => {
      const dto = {
        items: [
          {
            stockCode: '005930',
            accountBroker: '키움증권',
            accountType: 'GENERAL' as const,
            type: 'SELL' as const,
            tradeDate: '2026-02-10',
            price: 80000,
            quantity: 5,
          },
        ],
      };

      const mockResult = {
        imported: 1,
        skipped: 0,
        errors: [],
        totalBuyAmount: 0,
        totalSellAmount: 400000,
      };
      mockMigrationService.importTrades.mockResolvedValue(mockResult);

      const result = await controller.importTrades(mockReq, dto);

      expect(result).toEqual(mockResult);
    });
  });
});
