import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryTransactionDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '거래 유형',
    enum: ['INCOME', 'EXPENSE', 'SAVING'],
  })
  @IsOptional()
  @IsEnum(['INCOME', 'EXPENSE', 'SAVING'] as const)
  type?: 'INCOME' | 'EXPENSE' | 'SAVING';

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '시작 날짜', example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜', example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
