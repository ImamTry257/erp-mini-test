import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateInvoiceItemDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  itemName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantityAmount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  unitPrice?: number;
}
