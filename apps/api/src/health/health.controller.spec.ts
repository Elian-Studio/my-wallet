import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('DB 연결 정상이면 200 + ok 반환', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result).toEqual({ status: 'ok', db: 'connected' });
    });

    it('DB 연결 실패 시 503 반환', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.check()).rejects.toThrow(HttpException);
      await expect(controller.check()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });
  });
});
