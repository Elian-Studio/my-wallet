import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import type { TransactionType, CategoryNode } from '@my-wallet/shared';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Read ───────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '전체 카테고리 목록 조회 (flat)' })
  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  @Get('tree')
  @ApiOperation({ summary: '카테고리 트리 조회 (2-depth)' })
  async findTree(@Query('type') type?: TransactionType): Promise<CategoryNode[]> {
    const where: { isActive: boolean; type?: TransactionType } = { isActive: true };
    if (type) where.type = type;

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }],
    });

    const byId = new Map<string, CategoryNode>();
    for (const cat of categories) {
      byId.set(cat.id, {
        id: cat.id,
        name: cat.name,
        type: cat.type as TransactionType,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        children: [],
      });
    }

    const roots: CategoryNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId) {
        const parent = byId.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // 부모가 비활성/필터됨 → 루트로 승격
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    const sortByOrder = (a: CategoryNode, b: CategoryNode) => a.sortOrder - b.sortOrder;
    roots.sort(sortByOrder);
    for (const root of roots) root.children.sort(sortByOrder);

    return roots;
  }

  @Get('expense')
  @ApiOperation({ summary: '지출 카테고리 목록 조회' })
  findExpense() {
    return this.prisma.category.findMany({
      where: { isActive: true, type: 'EXPENSE' },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  @Get('income')
  @ApiOperation({ summary: '수입 카테고리 목록 조회' })
  findIncome() {
    return this.prisma.category.findMany({
      where: { isActive: true, type: 'INCOME' },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  @Get('saving')
  @ApiOperation({ summary: '저축 카테고리 목록 조회' })
  findSaving() {
    return this.prisma.category.findMany({
      where: { isActive: true, type: 'SAVING' },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: '카테고리 생성' })
  async create(@Body() dto: CreateCategoryDto) {
    const parentId = dto.parentId ?? null;

    // 1. parent 유효성 검증
    if (parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new HttpException('상위 카테고리를 찾을 수 없습니다.', HttpStatus.BAD_REQUEST);
      }
      if (parent.parentId !== null) {
        throw new HttpException(
          '카테고리 계층은 최대 2단계(대분류 > 소분류)까지만 허용됩니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (parent.type !== dto.type) {
        throw new HttpException(
          '상위 카테고리와 동일한 유형이어야 합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!parent.isActive) {
        throw new HttpException(
          '비활성 상위 카테고리 아래에는 소분류를 추가할 수 없습니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 2. 중복 검사 (name, type, parentId) — NULL parent도 고려
    const existing = await this.findByNameTypeParent(dto.name, dto.type, parentId);
    if (existing) {
      if (!existing.isActive) {
        return this.prisma.category.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            sortOrder: dto.sortOrder ?? existing.sortOrder,
          },
        });
      }
      throw new HttpException(
        '같은 위치에 동일한 이름의 카테고리가 이미 존재합니다.',
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────────

  @Put(':id')
  @ApiOperation({ summary: '카테고리 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!category) {
      throw new HttpException('카테고리를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const nextName = dto.name ?? category.name;
    const nextParentId =
      dto.parentId === undefined ? category.parentId : dto.parentId ?? null;

    // parentId 변경 시 검증
    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      if (nextParentId !== null) {
        // 자식이 있는 카테고리는 소분류로 변경 불가 (2-depth 유지)
        if (category.children.length > 0) {
          throw new HttpException(
            '하위 카테고리가 있는 대분류는 소분류로 변경할 수 없습니다.',
            HttpStatus.BAD_REQUEST,
          );
        }
        const parent = await this.prisma.category.findUnique({
          where: { id: nextParentId },
        });
        if (!parent) {
          throw new HttpException('상위 카테고리를 찾을 수 없습니다.', HttpStatus.BAD_REQUEST);
        }
        if (parent.parentId !== null) {
          throw new HttpException(
            '카테고리 계층은 최대 2단계까지만 허용됩니다.',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (parent.type !== category.type) {
          throw new HttpException(
            '상위 카테고리와 동일한 유형이어야 합니다.',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (parent.id === category.id) {
          throw new HttpException('자기 자신을 상위로 지정할 수 없습니다.', HttpStatus.BAD_REQUEST);
        }
      }
    }

    // 이름 또는 parentId 변경 시 중복 체크
    if (nextName !== category.name || nextParentId !== category.parentId) {
      const duplicate = await this.findByNameTypeParent(
        nextName,
        category.type as TransactionType,
        nextParentId,
      );
      if (duplicate && duplicate.id !== id) {
        throw new HttpException(
          '같은 위치에 동일한 이름의 카테고리가 이미 존재합니다.',
          HttpStatus.CONFLICT,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: nextParentId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ─── Delete ─────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({ summary: '카테고리 삭제 (비활성화)' })
  async remove(@Param('id') id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true, budgets: true, children: true } },
      },
    });
    if (!category) {
      throw new HttpException('카테고리를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    // 활성 자식이 있으면 삭제 차단
    const activeChildrenCount = await this.prisma.category.count({
      where: { parentId: id, isActive: true },
    });
    if (activeChildrenCount > 0) {
      throw new HttpException(
        '하위 카테고리가 있는 대분류는 삭제할 수 없습니다. 하위를 먼저 정리해주세요.',
        HttpStatus.CONFLICT,
      );
    }
    if (category._count.transactions > 0 || category._count.budgets > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.category.delete({ where: { id } });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async findByNameTypeParent(
    name: string,
    type: TransactionType,
    parentId: string | null,
  ) {
    return this.prisma.category.findFirst({
      where: { name, type, parentId },
    });
  }
}
