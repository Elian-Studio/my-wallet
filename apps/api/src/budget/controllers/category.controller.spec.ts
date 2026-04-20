import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type CategoryRow = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'SAVING';
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    name: '식비',
    type: 'EXPENSE',
    parentId: null,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('CategoryController', () => {
  let controller: CategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    jest.clearAllMocks();
  });

  // ─── findTree ──────────────────────────────────────────────────────────

  describe('findTree', () => {
    it('루트와 자식을 2-depth 트리로 조립한다', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        makeCategory({ id: 'p1', name: '주거', parentId: null, sortOrder: 1 }),
        makeCategory({ id: 'c1', name: '월세', parentId: 'p1', sortOrder: 1 }),
        makeCategory({ id: 'c2', name: '관리비', parentId: 'p1', sortOrder: 2 }),
        makeCategory({ id: 'p2', name: '식비', parentId: null, sortOrder: 2 }),
      ]);

      const result = await controller.findTree('EXPENSE');

      expect(result).toHaveLength(2);
      const [first, second] = result;
      expect(first.name).toBe('주거');
      expect(first.children).toHaveLength(2);
      expect(first.children[0].name).toBe('월세');
      expect(first.children[1].name).toBe('관리비');
      expect(second.name).toBe('식비');
      expect(second.children).toHaveLength(0);
    });

    it('부모가 결과에 없는 자식은 루트로 승격된다', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        makeCategory({ id: 'c1', name: '월세', parentId: 'missing' }),
      ]);

      const result = await controller.findTree('EXPENSE');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });

    it('sortOrder 기준 오름차순 정렬된다', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        makeCategory({ id: 'a', name: 'A', sortOrder: 5 }),
        makeCategory({ id: 'b', name: 'B', sortOrder: 1 }),
      ]);

      const result = await controller.findTree('EXPENSE');

      expect(result.map((r) => r.id)).toEqual(['b', 'a']);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('루트 카테고리를 생성한다', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(
        makeCategory({ id: 'new', name: '식비' }),
      );

      await controller.create({
        name: '식비',
        type: 'EXPENSE',
      });

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: {
          name: '식비',
          type: 'EXPENSE',
          parentId: null,
          sortOrder: 0,
        },
      });
    });

    it('자식 카테고리를 생성한다', async () => {
      const parent = makeCategory({ id: 'p1', name: '주거' });
      mockPrisma.category.findUnique.mockResolvedValue(parent);
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(
        makeCategory({ id: 'c1', name: '월세', parentId: 'p1' }),
      );

      await controller.create({
        name: '월세',
        type: 'EXPENSE',
        parentId: 'p1',
      });

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: {
          name: '월세',
          type: 'EXPENSE',
          parentId: 'p1',
          sortOrder: 0,
        },
      });
    });

    it('존재하지 않는 부모는 400을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        controller.create({ name: '월세', type: 'EXPENSE', parentId: 'missing' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('2-depth 초과 시 400 (부모 자신이 자식인 경우)', async () => {
      const parent = makeCategory({ id: 'p1', name: '월세', parentId: 'grandparent' });
      mockPrisma.category.findUnique.mockResolvedValue(parent);

      await expect(
        controller.create({ name: '세부', type: 'EXPENSE', parentId: 'p1' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('부모와 타입이 다르면 400', async () => {
      const parent = makeCategory({ id: 'p1', name: '주거', type: 'EXPENSE' });
      mockPrisma.category.findUnique.mockResolvedValue(parent);

      await expect(
        controller.create({ name: '월세', type: 'SAVING', parentId: 'p1' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('비활성 부모 밑에는 추가 불가 400', async () => {
      const parent = makeCategory({ id: 'p1', name: '주거', isActive: false });
      mockPrisma.category.findUnique.mockResolvedValue(parent);

      await expect(
        controller.create({ name: '월세', type: 'EXPENSE', parentId: 'p1' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('같은 위치에 중복 이름은 409', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(
        makeCategory({ id: 'existing', name: '식비' }),
      );

      await expect(
        controller.create({ name: '식비', type: 'EXPENSE' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });

    it('비활성 카테고리와 이름 충돌 시 재활성화한다', async () => {
      const existing = makeCategory({ id: 'x1', name: '식비', isActive: false });
      mockPrisma.category.findFirst.mockResolvedValue(existing);
      mockPrisma.category.update.mockResolvedValue({
        ...existing,
        isActive: true,
      });

      const result = await controller.create({ name: '식비', type: 'EXPENSE' });

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'x1' },
        data: { isActive: true, sortOrder: 0 },
      });
      expect(result.isActive).toBe(true);
    });

    it('REGRESSION: 다른 부모 아래 동일 이름은 허용된다', async () => {
      const parent = makeCategory({ id: 'p2', name: '저축' });
      mockPrisma.category.findUnique.mockResolvedValue(parent);
      // 다른 parent 하에서는 중복이 아님
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(
        makeCategory({ id: 'c1', name: '기타', parentId: 'p2' }),
      );

      await controller.create({ name: '기타', type: 'EXPENSE', parentId: 'p2' });

      expect(mockPrisma.category.create).toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    it('parent를 변경하여 reparent 한다', async () => {
      const leaf = { ...makeCategory({ id: 'c1', name: '월세', parentId: 'p1' }), children: [] };
      const newParent = makeCategory({ id: 'p2', name: '고정비' });
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(leaf)       // 대상 leaf
        .mockResolvedValueOnce(newParent); // 새 부모
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.update.mockResolvedValue({ ...leaf, parentId: 'p2' });

      await controller.update('c1', { parentId: 'p2' });

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { parentId: 'p2' },
      });
    });

    it('자기 자신을 parent로 지정하면 400', async () => {
      const cat = { ...makeCategory({ id: 'self' }), children: [] };
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(cat)
        .mockResolvedValueOnce(cat); // same

      await expect(
        controller.update('self', { parentId: 'self' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('자식 있는 대분류를 소분류로 변경 불가 400', async () => {
      const parentWithChildren = {
        ...makeCategory({ id: 'p1', name: '주거' }),
        children: [makeCategory({ id: 'c1', parentId: 'p1' })],
      };
      mockPrisma.category.findUnique.mockResolvedValueOnce(parentWithChildren);

      await expect(
        controller.update('p1', { parentId: 'other-parent' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('2-depth 초과 reparent 시도 400', async () => {
      const leaf = { ...makeCategory({ id: 'c1', parentId: 'p1' }), children: [] };
      const deepParent = makeCategory({ id: 'c-other', parentId: 'p2' });
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(leaf)
        .mockResolvedValueOnce(deepParent);

      await expect(
        controller.update('c1', { parentId: 'c-other' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('parent 타입이 다르면 reparent 400', async () => {
      const leaf = { ...makeCategory({ id: 'c1', type: 'EXPENSE', parentId: 'p1' }), children: [] };
      const otherTypeParent = makeCategory({ id: 'p-saving', type: 'SAVING' });
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(leaf)
        .mockResolvedValueOnce(otherTypeParent);

      await expect(
        controller.update('c1', { parentId: 'p-saving' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('이름 변경 시 중복 검사한다', async () => {
      const cat = { ...makeCategory({ id: 'c1', name: '식비' }), children: [] };
      const duplicate = makeCategory({ id: 'other', name: '새이름' });
      mockPrisma.category.findUnique.mockResolvedValueOnce(cat);
      mockPrisma.category.findFirst.mockResolvedValue(duplicate);

      await expect(
        controller.update('c1', { name: '새이름' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });

    it('없는 카테고리 수정은 404', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce(null);

      await expect(
        controller.update('missing', { name: 'x' }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('자식 있는 대분류는 409를 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...makeCategory({ id: 'p1' }),
        _count: { transactions: 0, budgets: 0, children: 2 },
      });
      mockPrisma.category.count.mockResolvedValue(2);

      await expect(controller.remove('p1')).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
      });
    });

    it('거래/예산 연결된 카테고리는 soft delete (isActive=false)', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...makeCategory({ id: 'c1' }),
        _count: { transactions: 5, budgets: 1, children: 0 },
      });
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.update.mockResolvedValue(
        makeCategory({ id: 'c1', isActive: false }),
      );

      await controller.remove('c1');

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { isActive: false },
      });
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });

    it('연결 없으면 hard delete', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...makeCategory({ id: 'c1' }),
        _count: { transactions: 0, budgets: 0, children: 0 },
      });
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue(makeCategory({ id: 'c1' }));

      await controller.remove('c1');

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(mockPrisma.category.update).not.toHaveBeenCalled();
    });

    it('없는 카테고리는 404', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(controller.remove('missing')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
