import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  async list(@Query() query: QueryCustomerDto) {
    return this.customersService.list(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
