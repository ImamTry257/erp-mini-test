import { redirect } from "next/navigation";
import { dashboardService } from "@/services/dashboard.service";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Currency } from "@/components/shared/currency";
import { DateText } from "@/components/shared/date-text";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, FileText, DollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let data;
  try {
    data = await dashboardService.getSummary();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your business"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Customers"
          value={data.totalCustomers}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Total Invoices"
          value={data.totalInvoices}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Total Revenue"
          value={<Currency amount={data.revenueSummary.totalAmount} />}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Invoice Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Paid"
          value={data.invoiceStatusCounts.PAID}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
        />
        <StatCard
          title="Pending"
          value={data.invoiceStatusCounts.PENDING}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          title="Overdue"
          value={data.invoiceStatusCounts.OVERDUE}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        />
        <StatCard
          title="Draft"
          value={data.invoiceStatusCounts.DRAFT}
          icon={<FileText className="h-4 w-4 text-gray-500" />}
        />
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Paid Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-600">
              <Currency amount={data.revenueSummary.paidAmount} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Pending Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-600">
              <Currency amount={data.revenueSummary.pendingAmount} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Overdue Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-600">
              <Currency amount={data.revenueSummary.overdueAmount} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link
              href="/invoices"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentInvoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No invoices yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.customer.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Currency amount={invoice.totalAmount} />
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate ? <DateText date={invoice.dueDate} /> : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
