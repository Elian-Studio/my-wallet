import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

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
}
