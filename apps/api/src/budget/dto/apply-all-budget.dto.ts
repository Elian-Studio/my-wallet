import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsArray, IsEnum } from 'class-validator';

export class ApplyAllPreviewDto {
  @ApiProperty({ description: '원본 연도', example: 2026 })
  @IsInt({ message: '연도는 정수여야 합니다.' })
  @Min(1, { message: '연도는 1 이상이어야 합니다.' })
  sourceYear: number;

  @ApiProperty({ description: '원본 월 (1-12)', example: 3 })
  @IsInt({ message: '월은 정수여야 합니다.' })
  @Min(1, { message: '월은 1 이상이어야 합니다.' })
  sourceMonth: number;

  @ApiProperty({ description: '적용 대상 연도', example: 2026 })
  @IsInt({ message: '연도는 정수여야 합니다.' })
  @Min(1, { message: '연도는 1 이상이어야 합니다.' })
  targetYear: number;
}

export class ApplyAllBudgetDto extends ApplyAllPreviewDto {
  @ApiProperty({
    description: '적용할 월 목록 (1-12)',
    example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    type: [Number],
  })
  @IsArray({ message: 'selectedMonths는 배열이어야 합니다.' })
  @IsInt({ each: true, message: '각 월은 정수여야 합니다.' })
  selectedMonths: number[];

  @ApiProperty({
    description: '충돌 처리 방식',
    enum: ['skip', 'overwrite'],
    example: 'overwrite',
  })
  @IsEnum(['skip', 'overwrite'] as const, {
    message: 'conflictMode는 skip 또는 overwrite여야 합니다.',
  })
  conflictMode: 'skip' | 'overwrite';
}
