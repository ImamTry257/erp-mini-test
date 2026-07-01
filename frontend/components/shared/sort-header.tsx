"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortHeaderProps {
  column: string;
  label: string;
}

export function SortHeader({ column, label }: SortHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSortBy = searchParams.get("sortBy");
  const currentOrder = searchParams.get("order") || "asc";

  const isActive = currentSortBy === column;

  const toggleSort = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", column);
      params.set("order", "asc");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleSort}
      className="h-8 px-2 text-left font-medium"
    >
      {label}
      {isActive ? (
        currentOrder === "asc" ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />
      )}
    </Button>
  );
}
