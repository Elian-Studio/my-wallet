import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ description: '카테고리 ID' })
  @IsString()
  @IsNotEmpty({ message: '카테고리 ID는 필수 입력입니다.' })
  categoryId: string;

  @ApiProperty({ description: '거래 유형', enum: ['INCOME', 'EXPENSE', 'SAVING'] })
  @IsEnum(['INCOME', 'EXPENSE', 'SAVING'] as const, {
    message: '유형은 INCOME, EXPENSE, SAVING 중 하나여야 합니다.',
  })
  type: 'INCOME' | 'EXPENSE' | 'SAVING';

  @ApiProperty({ description: '거래 제목', example: '점심식사' })
  @IsString()
  @IsNotEmpty({ message: '제목은 필수 입력입니다.' })
  title: string;

  @ApiProperty({ description: '금액 (원)', example: 12000, minimum: 1 })
  @IsInt({ message: '금액은 정수여야 합니다.' })
  @Min(1, { message: '금액은 1원 이상이어야 합니다.' })
  amount: number;

  @ApiProperty({ description: '거래 날짜', example: '2026-03-23' })
  @IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
  date: string;

  @ApiPropertyOptional({ description: '고정 지출 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isFixed?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;
}
