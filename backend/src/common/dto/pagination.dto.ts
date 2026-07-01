import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => value ?? 1)
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => value ?? 10)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function buildPagination<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data: items,
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}
