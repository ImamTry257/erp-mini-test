import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { IsString, IsOptional, IsIn, IsEnum } from 'class-validator';
import { InvoiceStatusUpdate } from './update-invoice-status.dto.js';

export class QueryInvoiceDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @IsIn(['invoiceNumber', 'dueDate', 'paidDate', 'status', 'totalAmount', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsEnum(InvoiceStatusUpdate)
  @IsOptional()
  status?: InvoiceStatusUpdate;

  @IsString()
  @IsOptional()
  customerId?: string;
}
