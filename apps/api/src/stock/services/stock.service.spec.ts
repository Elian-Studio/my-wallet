import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { StockService } from './stock.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  stock: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  stockAccount: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockStock = {
  id: 's1',
  code: 'KRX001',
  name: '삼성전자',
  market: 'KRX',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('StockService', () => {
  let service: StockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('검색어 없이 활성 종목 목록을 반환한다', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([mockStock]);

      const result = await service.findAll();

      expect(result).toEqual([mockStock]);
      expect(mockPrisma.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('검색어가 있으면 OR 조건으로 name/code를 검색한다', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([mockStock]);

      const result = await service.findAll('삼성');

      expect(result).toEqual([mockStock]);
      expect(mockPrisma.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            OR: [
              { name: { contains: '삼성', mode: 'insensitive' } },
              { code: { contains: '삼성', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('존재하는 id로 조회 시 stockPrices를 포함하여 반환한다', async () => {
      const stockWithPrices = { ...mockStock, stockPrices: [] };
      mockPrisma.stock.findUnique.mockResolvedValue(stockWithPrices);

      const result = await service.findOne('s1');

      expect(result).toEqual(stockWithPrices);
      expect(mockPrisma.stock.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
        include: { stockPrices: true },
      });
    });

    it('존재하지 않는 id로 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(null);

      await expect(service.findOne('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('존재하는 code로 조회 시 stockPrices를 포함하여 반환한다', async () => {
      const stockWithPrices = { ...mockStock, stockPrices: [] };
      mockPrisma.stock.findUnique.mockResolvedValue(stockWithPrices);

      const result = await service.findByCode('KRX001');

      expect(result).toEqual(stockWithPrices);
      expect(mockPrisma.stock.findUnique).toHaveBeenCalledWith({
        where: { code: 'KRX001' },
        include: { stockPrices: true },
      });
    });

    it('존재하지 않는 code로 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('새로운 종목을 정상적으로 생성한다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(null);
      mockPrisma.stock.create.mockResolvedValue(mockStock);

      const result = await service.create({ code: 'KRX001', name: '삼성전자' });

      expect(result).toEqual(mockStock);
      expect(mockPrisma.stock.create).toHaveBeenCalledWith({
        data: { code: 'KRX001', name: '삼성전자', market: 'KRX' },
      });
    });

    it('market을 지정하면 해당 market으로 생성된다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(null);
      mockPrisma.stock.create.mockResolvedValue({ ...mockStock, market: 'NYSE' });

      await service.create({ code: 'AAPL', name: 'Apple', market: 'NYSE' });

      expect(mockPrisma.stock.create).toHaveBeenCalledWith({
        data: { code: 'AAPL', name: 'Apple', market: 'NYSE' },
      });
    });

    it('이미 등록된 코드면 ConflictException을 던진다', async () => {
      mockPrisma.stock.findUnique.mockResolvedValue(mockStock);

      await expect(
        service.create({ code: 'KRX001', name: '삼성전자' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.stock.create).not.toHaveBeenCalled();
    });
  });

  describe('getAccounts', () => {
    it('userId에 해당하는 활성 계좌 목록을 반환한다', async () => {
      const mockAccounts = [
        { id: 'acc-1', userId: 'user-1', type: 'GENERAL', broker: '키움', alias: null, isActive: true, createdAt: new Date() },
      ];
      mockPrisma.stockAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getAccounts('user-1');

      expect(result).toEqual(mockAccounts);
      expect(mockPrisma.stockAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createAccount', () => {
    it('새로운 증권 계좌를 생성한다', async () => {
      const mockAccount = {
        id: 'acc-new',
        userId: 'user-1',
        type: 'ISA',
        broker: '미래에셋',
        alias: '연금ISA',
        isActive: true,
        createdAt: new Date(),
      };
      mockPrisma.stockAccount.create.mockResolvedValue(mockAccount);

      const result = await service.createAccount('user-1', {
        type: 'ISA',
        broker: '미래에셋',
        alias: '연금ISA',
      });

      expect(result).toEqual(mockAccount);
      expect(mockPrisma.stockAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'ISA',
          broker: '미래에셋',
          alias: '연금ISA',
        },
      });
    });
  });
});
