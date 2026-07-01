import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  PENDING: {
    label: "Pending",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  PAID: {
    label: "Paid",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
