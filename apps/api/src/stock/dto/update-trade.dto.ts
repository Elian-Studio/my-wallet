import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, IsOptional, IsArray, IsDateString } from 'class-validator';

export class UpdateTradeDto {
  @ApiPropertyOptional({ description: '거래 날짜', example: '2026-03-23' })
  @IsOptional()
  @IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
  tradeDate?: string;

  @ApiPropertyOptional({ description: '매매 단가 (원)', example: 50000 })
  @IsOptional()
  @IsInt({ message: '단가는 정수여야 합니다.' })
  @Min(1, { message: '단가는 1원 이상이어야 합니다.' })
  price?: number;

  @ApiPropertyOptional({ description: '수량', example: 10 })
  @IsOptional()
  @IsInt({ message: '수량은 정수여야 합니다.' })
  @Min(1, { message: '수량은 1 이상이어야 합니다.' })
  quantity?: number;

  @ApiPropertyOptional({
    description: '매매 사유',
    type: [String],
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
