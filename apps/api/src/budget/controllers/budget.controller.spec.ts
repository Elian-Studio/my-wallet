import { Test, TestingModule } from '@nestjs/testing';
import { BudgetController } from './budget.controller';
import { BudgetService } from '../services/budget.service';
import { BudgetAnalysisService } from '../services/budget-analysis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const mockBudgetService = {
  create: jest.fn(),
  findByMonth: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockBudgetAnalysisService = {
  analyze: jest.fn(),
};

const mockReq = { user: { id: 'user-1' } };

describe('BudgetController', () => {
  let controller: BudgetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: BudgetAnalysisService, useValue: mockBudgetAnalysisService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BudgetController>(BudgetController);
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의된다', () => {
    expect(controller).toBeDefined();
  });

  describe('JwtAuthGuard 적용', () => {
    it('컨트롤러 클래스에 JwtAuthGuard가 적용되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', BudgetController);
      expect(guards).toBeDefined();
      expect(guards.some((g: Function) => g === JwtAuthGuard)).toBe(true);
    });
  });

  describe('create (POST /budgets)', () => {
    it('BudgetService.create를 올바른 인자로 호출한다', async () => {
      const dto = { categoryId: 'cat-1', type: 'EXPENSE' as const, month: '2026-03-01', amount: 300000 };
      const expected = { id: 'b1', ...dto };
      mockBudgetService.create.mockResolvedValue(expected);

      const result = await controller.create(mockReq, dto);

      expect(mockBudgetService.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findByMonth (GET /budgets)', () => {
    it('BudgetService.findByMonth를 올바른 인자로 호출한다', async () => {
      const budgets = [{ id: 'b1' }, { id: 'b2' }];
      mockBudgetService.findByMonth.mockResolvedValue(budgets);

      const result = await controller.findByMonth(mockReq, 2026, 3);

      expect(mockBudgetService.findByMonth).toHaveBeenCalledWith('user-1', 2026, 3);
      expect(result).toEqual(budgets);
    });
  });

  describe('getAnalysis (GET /budgets/analysis)', () => {
    it('BudgetAnalysisService.analyze를 올바른 인자로 호출한다', async () => {
      const analysis = [{ categoryId: 'cat-1', status: 'GOOD' }];
      mockBudgetAnalysisService.analyze.mockResolvedValue(analysis);

      const result = await controller.getAnalysis(mockReq, 2026, 3);

      expect(mockBudgetAnalysisService.analyze).toHaveBeenCalledWith('user-1', 2026, 3);
      expect(result).toEqual(analysis);
    });
  });

  describe('findOne (GET /budgets/:id)', () => {
    it('BudgetService.findOne을 올바른 인자로 호출한다', async () => {
      const budget = { id: 'b1', amount: 300000 };
      mockBudgetService.findOne.mockResolvedValue(budget);

      const result = await controller.findOne(mockReq, 'b1');

      expect(mockBudgetService.findOne).toHaveBeenCalledWith('user-1', 'b1');
      expect(result).toEqual(budget);
    });
  });

  describe('update (PUT /budgets/:id)', () => {
    it('BudgetService.update를 올바른 인자로 호출한다', async () => {
      const dto = { amount: 500000 };
      const updated = { id: 'b1', amount: 500000 };
      mockBudgetService.update.mockResolvedValue(updated);

      const result = await controller.update(mockReq, 'b1', dto);

      expect(mockBudgetService.update).toHaveBeenCalledWith('user-1', 'b1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove (DELETE /budgets/:id)', () => {
    it('BudgetService.remove를 올바른 인자로 호출한다', async () => {
      mockBudgetService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(mockReq, 'b1');

      expect(mockBudgetService.remove).toHaveBeenCalledWith('user-1', 'b1');
      expect(result).toEqual({ deleted: true });
    });
  });
});
