import { Skeleton } from "@/components/ui/skeleton";

interface LoadingTableProps {
  columns: number;
  rows?: number;
}

export function LoadingTable({ columns, rows = 5 }: LoadingTableProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
