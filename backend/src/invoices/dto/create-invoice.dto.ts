import { IsString, IsOptional, IsInt, Min, IsDateString, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto.js';

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsUUID()
  customerId!: string;

  @IsDateString()
  dueDate!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  taxAmount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}
