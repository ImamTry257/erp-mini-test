import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto.js';
import { QueryInvoiceDto } from './dto/query-invoice.dto.js';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto.js';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto.js';
import { buildPagination } from '../common/dto/pagination.dto.js';
import { Prisma } from '../generated/prisma/client.js';

// ============ Derived Field Helpers ============

function computeLineTotal(item: { quantityAmount: number; unitPrice: number }) {
  return item.quantityAmount * item.unitPrice;
}

function computeInvoiceAmounts(
  items: { lineTotal: number }[],
  tax: number,
  discount: number,
) {
  const subtotalAmount = items.reduce((s, i) => s + i.lineTotal, 0);
  const totalAmount = subtotalAmount + tax - discount;
  return { subtotalAmount, totalAmount };
}

// ============ Invoice Number Generator ============

async function generateInvoiceNumber(
  prisma: PrismaService,
  year = new Date().getFullYear(),
) {
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const seq = last ? Number(last.invoiceNumber.slice(-4)) + 1 : 1;
  return `${prefix}${seq.toString().padStart(4, '0')}`;
}

// ============ Overdue Detection ============

function mapOverdue<T extends { status: string; dueDate: Date }>(inv: T): T {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (inv.status === 'PENDING' && inv.dueDate < startOfToday) {
    return { ...inv, status: 'OVERDUE' };
  }
  return inv;
}

// ============ Service ============

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(dto: CreateInvoiceDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate customer exists
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundException('Customer tidak ditemukan');
      }

      // 2. Resolve invoice number
      let invoiceNumber = dto.invoiceNumber;
      if (invoiceNumber) {
        const existing = await tx.invoice.findFirst({
          where: { invoiceNumber },
        });
        if (existing) {
          throw new ConflictException('Nomor invoice sudah digunakan');
        }
      } else {
        invoiceNumber = await generateInvoiceNumber(tx as any);
      }

      // 3. Compute amounts
      const itemsWithTotal = dto.items.map((item) => ({
        ...item,
        lineTotal: computeLineTotal(item),
      }));
      const { subtotalAmount, totalAmount } = computeInvoiceAmounts(
        itemsWithTotal,
        dto.taxAmount ?? 0,
        dto.discountAmount ?? 0,
      );

      // 4. Create invoice with nested items
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          status: 'DRAFT',
          dueDate: new Date(dto.dueDate),
          subtotalAmount,
          taxAmount: dto.taxAmount ?? 0,
          discountAmount: dto.discountAmount ?? 0,
          totalAmount,
          notes: dto.notes,
          customerId: dto.customerId,
          createdById: userId,
          items: {
            create: itemsWithTotal.map((item) => ({
              itemName: item.itemName,
              description: item.description,
              quantityAmount: item.quantityAmount,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: true,
        },
      });

      return invoice;
    });
  }

  // ---------- LIST ----------
  async list(query: QueryInvoiceDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      startDate,
      endDate,
      status,
      customerId,
    } = query;

    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(status && { status: status as any }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const orderBy: Prisma.InvoiceOrderByWithRelationInput = {
      [sortBy]: order,
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    // Apply overdue detection
    const mappedItems = items.map((item) => mapOverdue(item));

    return buildPagination(mappedItems, total, page, limit);
  }

  // ---------- FIND BY ID ----------
  async findById(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: { where: { deletedAt: null } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    return mapOverdue(invoice);
  }

  // ---------- UPDATE ----------
  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    // Only DRAFT can be edited
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Hanya invoice DRAFT yang bisa diedit');
    }

    // Check invoice number uniqueness
    if (dto.invoiceNumber && dto.invoiceNumber !== invoice.invoiceNumber) {
      const existing = await this.prisma.invoice.findFirst({
        where: { invoiceNumber: dto.invoiceNumber },
      });
      if (existing) {
        throw new ConflictException('Nomor invoice sudah digunakan');
      }
    }

    // Validate customer
    if (dto.customerId && dto.customerId !== invoice.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundException('Customer tidak ditemukan');
      }
    }

    // Recompute total if tax/discount changed
    let updateData: Prisma.InvoiceUpdateInput = {};
    if (dto.invoiceNumber) updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.customerId) {
      updateData.customer = { connect: { id: dto.customerId } };
    }
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.taxAmount !== undefined || dto.discountAmount !== undefined) {
      const currentItems = await this.prisma.invoiceItem.findMany({
        where: { invoiceId: id, deletedAt: null },
      });
      const { subtotalAmount, totalAmount } = computeInvoiceAmounts(
        currentItems,
        dto.taxAmount ?? invoice.taxAmount,
        dto.discountAmount ?? invoice.discountAmount,
      );
      updateData.subtotalAmount = subtotalAmount;
      updateData.totalAmount = totalAmount;
      if (dto.taxAmount !== undefined) updateData.taxAmount = dto.taxAmount;
      if (dto.discountAmount !== undefined)
        updateData.discountAmount = dto.discountAmount;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        items: { where: { deletedAt: null } },
      },
    });
  }

  // ---------- UPDATE STATUS ----------
  async updateStatus(id: string, dto: UpdateInvoiceStatusDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    // State machine validation
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['PENDING'],
      PENDING: ['PAID', 'OVERDUE'],
      OVERDUE: ['PAID'],
      PAID: [],
    };

    const allowed = validTransitions[invoice.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Transisi dari ${invoice.status} ke ${dto.status} tidak diizinkan`,
      );
    }

    const updateData: Prisma.InvoiceUpdateInput = {
      status: dto.status as any,
    };

    // On PAID: set paidDate
    if (dto.status === 'PAID') {
      updateData.paidDate = dto.paidDate
        ? new Date(dto.paidDate)
        : new Date();
    }

    // On OVERDUE: clear paidDate
    if (dto.status === 'OVERDUE') {
      updateData.paidDate = null;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
    });
  }

  // ---------- REMOVE (soft delete) ----------
  async remove(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    return this.prisma.$transaction(async (tx) => {
      // Soft delete items first
      await tx.invoiceItem.updateMany({
        where: { invoiceId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Soft delete invoice
      return tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  // ============ INVOICE ITEMS ============

  // ---------- ADD ITEM ----------
  async addItem(invoiceId: string, dto: CreateInvoiceItemDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Hanya invoice DRAFT yang bisa ditambah item');
    }

    return this.prisma.$transaction(async (tx) => {
      const lineTotal = computeLineTotal(dto);

      await tx.invoiceItem.create({
        data: {
          invoiceId,
          itemName: dto.itemName,
          description: dto.description,
          quantityAmount: dto.quantityAmount,
          unitPrice: dto.unitPrice,
          lineTotal,
        },
      });

      // Recompute parent amounts
      await this.recomputeAndSave(tx, invoiceId);

      return tx.invoice.findFirst({
        where: { id: invoiceId },
        include: {
          customer: { select: { id: true, name: true } },
          items: { where: { deletedAt: null } },
        },
      });
    });
  }

  // ---------- UPDATE ITEM ----------
  async updateItem(invoiceId: string, itemId: string, dto: UpdateInvoiceItemDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Hanya invoice DRAFT yang bisa diedit itemnya');
    }

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Item tidak ditemukan');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.itemName) updateData.itemName = dto.itemName;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.quantityAmount !== undefined) updateData.quantityAmount = dto.quantityAmount;
      if (dto.unitPrice !== undefined) updateData.unitPrice = dto.unitPrice;

      // Recompute lineTotal
      const quantity = dto.quantityAmount ?? item.quantityAmount;
      const price = dto.unitPrice ?? item.unitPrice;
      updateData.lineTotal = quantity * price;

      await tx.invoiceItem.update({
        where: { id: itemId },
        data: updateData,
      });

      // Recompute parent amounts
      await this.recomputeAndSave(tx, invoiceId);

      return tx.invoice.findFirst({
        where: { id: invoiceId },
        include: {
          customer: { select: { id: true, name: true } },
          items: { where: { deletedAt: null } },
        },
      });
    });
  }

  // ---------- REMOVE ITEM ----------
  async removeItem(invoiceId: string, itemId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Hanya invoice DRAFT yang bisa dihapus itemnya');
    }

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Item tidak ditemukan');
    }

    return this.prisma.$transaction(async (tx) => {
      // Soft delete item
      await tx.invoiceItem.update({
        where: { id: itemId },
        data: { deletedAt: new Date() },
      });

      // Recompute parent amounts
      await this.recomputeAndSave(tx, invoiceId);

      return tx.invoice.findFirst({
        where: { id: invoiceId },
        include: {
          customer: { select: { id: true, name: true } },
          items: { where: { deletedAt: null } },
        },
      });
    });
  }

  // ---------- RECOMPUTE HELPER ----------
  private async recomputeAndSave(tx: any, invoiceId: string) {
    const items = await tx.invoiceItem.findMany({
      where: { invoiceId, deletedAt: null },
    });
    const subtotalAmount = items.reduce(
      (s: number, i: any) => s + i.lineTotal,
      0,
    );
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });
    const totalAmount =
      subtotalAmount + invoice.taxAmount - invoice.discountAmount;
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotalAmount, totalAmount },
    });
  }
}
