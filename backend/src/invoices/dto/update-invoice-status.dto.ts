import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum InvoiceStatusUpdate {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatusUpdate)
  status!: InvoiceStatusUpdate;

  @IsDateString()
  @IsOptional()
  paidDate?: string;
}
