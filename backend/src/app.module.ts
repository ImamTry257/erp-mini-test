import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    InvoicesModule,
  ],
})
export class AppModule {}
