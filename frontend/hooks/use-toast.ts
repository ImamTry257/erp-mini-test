"use client";

import { useToast as useToastContext } from "@/contexts/toast-context";

export function useToast() {
  return useToastContext();
}
