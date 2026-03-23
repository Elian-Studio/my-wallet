import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateTradeDto {
  @ApiProperty({ description: '종목 ID' })
  @IsString()
  @IsNotEmpty({ message: '종목 ID는 필수 입력입니다.' })
  stockId: string;

  @ApiProperty({ description: '계좌 ID' })
  @IsString()
  @IsNotEmpty({ message: '계좌 ID는 필수 입력입니다.' })
  accountId: string;

  @ApiProperty({ description: '매매 유형', enum: ['BUY', 'SELL'] })
  @IsEnum(['BUY', 'SELL'] as const, {
    message: '유형은 BUY 또는 SELL이어야 합니다.',
  })
  type: 'BUY' | 'SELL';

  @ApiProperty({ description: '거래 날짜', example: '2026-03-23' })
  @IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
  tradeDate: string;

  @ApiProperty({ description: '매매 단가 (원)', example: 50000, minimum: 1 })
  @IsInt({ message: '단가는 정수여야 합니다.' })
  @Min(1, { message: '단가는 1원 이상이어야 합니다.' })
  price: number;

  @ApiProperty({ description: '수량', example: 10, minimum: 1 })
  @IsInt({ message: '수량은 정수여야 합니다.' })
  @Min(1, { message: '수량은 1 이상이어야 합니다.' })
  quantity: number;

  @ApiPropertyOptional({
    description: '매매 사유',
    type: [String],
    example: ['실적 호조', '저평가'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reason?: string[];

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;
}
