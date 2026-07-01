import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoiceItemsController } from './invoice-items.controller.js';

@Module({
  controllers: [InvoicesController, InvoiceItemsController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
