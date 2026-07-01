import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(startDate?: string, endDate?: string) {
    // Default: 30 hari terakhir
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Total customers (aktif)
    const totalCustomers = await this.prisma.customer.count({
      where: { deletedAt: null },
    });

    // 2. Invoice counts per status (dengan overdue detection)
    const invoices = await this.prisma.$queryRaw<
      { status: string; count: number }[]
    >`
      SELECT
        CASE
          WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE status
        END as status,
        COUNT(*)::int as count
      FROM invoices
      WHERE deleted_at IS NULL
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY
        CASE
          WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE status
        END
    `;

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      PENDING: 0,
      PAID: 0,
      OVERDUE: 0,
    };

    let totalInvoices = 0;
    for (const row of invoices) {
      statusCounts[row.status] = Number(row.count);
      totalInvoices += Number(row.count);
    }

    // 3. Revenue summary
    const revenue = await this.prisma.$queryRaw<
      {
        status: string;
        total_amount: number;
      }[]
    >`
      SELECT
        CASE
          WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE status
        END as status,
        COALESCE(SUM(total_amount), 0)::int as total_amount
      FROM invoices
      WHERE deleted_at IS NULL
        AND status IN ('PAID', 'PENDING', 'OVERDUE')
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY
        CASE
          WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE status
        END
    `;

    const revenueSummary = {
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      totalAmount: 0,
    };

    for (const row of revenue) {
      const amount = Number(row.total_amount);
      if (row.status === 'PAID') revenueSummary.paidAmount = amount;
      if (row.status === 'PENDING') revenueSummary.pendingAmount = amount;
      if (row.status === 'OVERDUE') revenueSummary.overdueAmount = amount;
      revenueSummary.totalAmount += amount;
    }

    // 4. Recent invoices (5 terbaru)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    // Apply overdue detection
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const recentWithOverdue = recentInvoices.map((inv) => {
      if (inv.status === 'PENDING' && inv.dueDate < startOfToday) {
        return { ...inv, status: 'OVERDUE' };
      }
      return inv;
    });

    return {
      totalCustomers,
      totalInvoices,
      invoiceStatusCounts: statusCounts,
      revenueSummary,
      recentInvoices: recentWithOverdue,
      dateRange: {
        startDate: start,
        endDate: end,
      },
    };
  }
}
