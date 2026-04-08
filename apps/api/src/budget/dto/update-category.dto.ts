import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '카테고리 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
