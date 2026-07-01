import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';
import { buildPagination } from '../common/dto/pagination.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async list(query: QueryCustomerDto) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', order = 'desc', startDate, endDate } = query;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: order,
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return buildPagination(items, total, page, limit);
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Customer tidak ditemukan');
    }

    return customer;
  }

  async create(dto: CreateCustomerDto) {
    // Cek email uniqueness
    const existing = await this.prisma.customer.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email sudah digunakan');
    }

    return this.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    // Cek customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Customer tidak ditemukan');
    }

    // Cek email uniqueness jika email diupdate
    if (dto.email && dto.email !== customer.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { email: dto.email, deletedAt: null },
      });

      if (existing) {
        throw new ConflictException('Email sudah digunakan');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
      },
    });
  }

  async remove(id: string) {
    // Cek customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Customer tidak ditemukan');
    }

    // Cek apakah customer punya invoice aktif
    const hasInvoices = await this.prisma.invoice.findFirst({
      where: {
        customerId: id,
        deletedAt: null,
      },
    });

    if (hasInvoices) {
      throw new ConflictException('Customer tidak bisa dihapus karena masih memiliki invoice');
    }

    // Soft delete
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
