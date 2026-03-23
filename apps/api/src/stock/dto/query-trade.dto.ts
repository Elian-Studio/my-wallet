import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryTradeDto extends PaginationDto {
  @ApiPropertyOptional({ description: '종목 ID' })
  @IsOptional()
  @IsString()
  stockId?: string;

  @ApiPropertyOptional({ description: '계좌 ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: '매매 유형', enum: ['BUY', 'SELL'] })
  @IsOptional()
  @IsEnum(['BUY', 'SELL'] as const)
  type?: 'BUY' | 'SELL';

  @ApiPropertyOptional({ description: '시작 날짜', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
