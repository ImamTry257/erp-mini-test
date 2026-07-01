"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

// ============================================================
// Types
// ============================================================

export type ToastVariant = "default" | "success" | "destructive";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type ToastState = {
  toasts: Toast[];
};

type ToastAction =
  | { type: "ADD"; payload: Toast }
  | { type: "DISMISS"; payload: string };

// ============================================================
// Reducer
// ============================================================

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "DISMISS":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

type ToastContextValue = {
  toasts: Toast[];
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ============================================================
// Provider
// ============================================================

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const toast = useCallback(
    (opts: { title: string; description?: string; variant?: ToastVariant }) => {
      const id = `toast-${++toastCounter}`;
      dispatch({ type: "ADD", payload: { id, ...opts } });

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        dispatch({ type: "DISMISS", payload: id });
      }, 4000);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "DISMISS", payload: id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}
