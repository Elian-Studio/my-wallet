import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportBudgetItem {
  @ApiProperty({ description: '카테고리 이름', example: '식비' })
  @IsString()
  @IsNotEmpty({ message: '카테고리 이름은 필수 입력입니다.' })
  categoryName: string;

  @ApiProperty({ description: '거래 유형', enum: ['INCOME', 'EXPENSE', 'SAVING'] })
  @IsEnum(['INCOME', 'EXPENSE', 'SAVING'] as const, {
    message: '유형은 INCOME, EXPENSE, SAVING 중 하나여야 합니다.',
  })
  type: 'INCOME' | 'EXPENSE' | 'SAVING';

  @ApiProperty({ description: '예산 월 (YYYY-MM-DD, 월의 첫 날)', example: '2026-03-01' })
  @IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
  month: string;

  @ApiProperty({ description: '예산 금액 (원)', example: 300000, minimum: 1 })
  @IsInt({ message: '금액은 정수여야 합니다.' })
  @Min(1, { message: '금액은 1원 이상이어야 합니다.' })
  amount: number;
}

export class ImportBudgetsDto {
  @ApiProperty({ type: [ImportBudgetItem], description: '예산 목록' })
  @IsArray()
  @ArrayNotEmpty({ message: '예산 목록이 비어있습니다.' })
  @ValidateNested({ each: true })
  @Type(() => ImportBudgetItem)
  items: ImportBudgetItem[];
}
