import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: '카테고리 이름', example: '식비' })
  @IsString()
  @IsNotEmpty({ message: '카테고리 이름은 필수 입력입니다.' })
  name: string;

  @ApiProperty({ description: '거래 유형', enum: ['INCOME', 'EXPENSE', 'SAVING'] })
  @IsEnum(['INCOME', 'EXPENSE', 'SAVING'] as const, {
    message: '유형은 INCOME, EXPENSE, SAVING 중 하나여야 합니다.',
  })
  type: 'INCOME' | 'EXPENSE' | 'SAVING';

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
