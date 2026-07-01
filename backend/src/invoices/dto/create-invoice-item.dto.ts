import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateInvoiceItemDto {
  @IsString()
  @MaxLength(100)
  itemName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  quantityAmount!: number;

  @IsInt()
  @Min(0)
  unitPrice!: number;
}
