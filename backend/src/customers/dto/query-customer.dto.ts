import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class QueryCustomerDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @IsIn(['name', 'email', 'phone', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';
}
