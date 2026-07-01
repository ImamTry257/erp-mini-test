import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto.js';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@Controller('invoices/:invoiceId/items')
@UseGuards(JwtAuthGuard)
export class InvoiceItemsController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateInvoiceItemDto,
  ) {
    return this.invoicesService.addItem(invoiceId, dto);
  }

  @Patch(':itemId')
  async update(
    @Param('invoiceId') invoiceId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    return this.invoicesService.updateItem(invoiceId, itemId, dto);
  }

  @Delete(':itemId')
  async remove(
    @Param('invoiceId') invoiceId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.invoicesService.removeItem(invoiceId, itemId);
  }
}
