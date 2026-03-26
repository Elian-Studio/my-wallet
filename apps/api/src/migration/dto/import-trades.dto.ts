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
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportTradeItem {
  @ApiProperty({ description: '종목 코드', example: '005930' })
  @IsString()
  @IsNotEmpty({ message: '종목 코드는 필수 입력입니다.' })
  stockCode: string;

  @ApiProperty({ description: '증권사', example: '키움증권' })
  @IsString()
  @IsNotEmpty({ message: '증권사는 필수 입력입니다.' })
  accountBroker: string;

  @ApiProperty({ description: '계좌 유형', enum: ['GENERAL', 'ISA', 'PENSION', 'IRP'] })
  @IsEnum(['GENERAL', 'ISA', 'PENSION', 'IRP'] as const, {
    message: '계좌 유형은 GENERAL, ISA, PENSION, IRP 중 하나여야 합니다.',
  })
  accountType: 'GENERAL' | 'ISA' | 'PENSION' | 'IRP';

  @ApiProperty({ description: '매매 유형', enum: ['BUY', 'SELL'] })
  @IsEnum(['BUY', 'SELL'] as const, {
    message: '유형은 BUY 또는 SELL이어야 합니다.',
  })
  type: 'BUY' | 'SELL';

  @ApiProperty({ description: '거래 날짜 (YYYY-MM-DD)', example: '2026-03-15' })
  @IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
  tradeDate: string;

  @ApiProperty({ description: '매매 단가 (원)', example: 70000, minimum: 1 })
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

export class ImportTradesDto {
  @ApiProperty({ type: [ImportTradeItem], description: '거래 목록' })
  @IsArray()
  @ArrayNotEmpty({ message: '거래 목록이 비어있습니다.' })
  @ValidateNested({ each: true })
  @Type(() => ImportTradeItem)
  items: ImportTradeItem[];
}
