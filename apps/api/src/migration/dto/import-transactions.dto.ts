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
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportTransactionItem {
  @ApiProperty({ description: '카테고리 이름', example: '식비' })
  @IsString()
  @IsNotEmpty({ message: '카테고리 이름은 필수 입력입니다.' })
  categoryName: string;

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

  @ApiProperty({ description: '거래 날짜 (YYYY-MM-DD)', example: '2026-03-15' })
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

export class ImportTransactionsDto {
  @ApiProperty({ type: [ImportTransactionItem], description: '거래 내역 목록' })
  @IsArray()
  @ArrayNotEmpty({ message: '거래 내역 목록이 비어있습니다.' })
  @ValidateNested({ each: true })
  @Type(() => ImportTransactionItem)
  items: ImportTransactionItem[];
}
