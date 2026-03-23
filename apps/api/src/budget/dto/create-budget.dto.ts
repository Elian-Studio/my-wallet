import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ description: '카테고리 ID' })
  @IsString()
  @IsNotEmpty({ message: '카테고리 ID는 필수 입력입니다.' })
  categoryId: string;

  @ApiProperty({ description: '예산 유형', enum: ['INCOME', 'EXPENSE', 'SAVING'] })
  @IsEnum(['INCOME', 'EXPENSE', 'SAVING'] as const, {
    message: '유형은 INCOME, EXPENSE, SAVING 중 하나여야 합니다.',
  })
  type: 'INCOME' | 'EXPENSE' | 'SAVING';

  @ApiProperty({
    description: '예산 월 (월 첫째 날)',
    example: '2026-03-01',
  })
  @IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
  month: string;

  @ApiProperty({ description: '예산 금액 (원)', example: 300000, minimum: 0 })
  @IsInt({ message: '금액은 정수여야 합니다.' })
  @Min(0, { message: '예산은 0원 이상이어야 합니다.' })
  amount: number;
}

export class UpdateBudgetDto {
  @ApiProperty({ description: '예산 금액 (원)', example: 300000, minimum: 0 })
  @IsInt({ message: '금액은 정수여야 합니다.' })
  @Min(0, { message: '예산은 0원 이상이어야 합니다.' })
  amount: number;
}
