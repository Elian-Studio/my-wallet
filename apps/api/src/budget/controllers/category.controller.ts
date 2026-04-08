import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '전체 카테고리 목록 조회' })
  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  @Get('expense')
  @ApiOperation({ summary: '지출 카테고리 목록 조회' })
  findExpense() {
    return this.prisma.category.findMany({
      where: { isActive: true, type: 'EXPENSE' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Get('income')
  @ApiOperation({ summary: '수입 카테고리 목록 조회' })
  findIncome() {
    return this.prisma.category.findMany({
      where: { isActive: true, type: 'INCOME' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Get('saving')
  @ApiOperation({ summary: '저축 카테고리 목록 조회' })
  findSaving() {
    return this.prisma.category.findMany({
      where: { isActive: true, type: 'SAVING' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post()
  @ApiOperation({ summary: '카테고리 생성' })
  async create(@Body() dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name_type: { name: dto.name, type: dto.type } },
    });
    if (existing) {
      if (!existing.isActive) {
        // 비활성 카테고리 재활성화
        return this.prisma.category.update({
          where: { id: existing.id },
          data: { isActive: true, sortOrder: dto.sortOrder ?? existing.sortOrder },
        });
      }
      throw new HttpException(
        '같은 유형에 동일한 이름의 카테고리가 이미 존재합니다.',
        HttpStatus.CONFLICT,
      );
    }
    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '카테고리 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new HttpException('카테고리를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    // 이름 변경 시 중복 체크
    if (dto.name && dto.name !== category.name) {
      const duplicate = await this.prisma.category.findUnique({
        where: { name_type: { name: dto.name, type: category.type } },
      });
      if (duplicate && duplicate.id !== id) {
        throw new HttpException(
          '같은 유형에 동일한 이름의 카테고리가 이미 존재합니다.',
          HttpStatus.CONFLICT,
        );
      }
    }
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: '카테고리 삭제 (비활성화)' })
  async remove(@Param('id') id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true, budgets: true } } },
    });
    if (!category) {
      throw new HttpException('카테고리를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    // 연결된 거래/예산이 있으면 soft delete
    if (category._count.transactions > 0 || category._count.budgets > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }
    // 연결된 데이터 없으면 하드 삭제
    return this.prisma.category.delete({ where: { id } });
  }
}
