"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";

// ============================================================
// State
// ============================================================

type AuthState = {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

type AuthAction =
  | { type: "HYDRATE"; payload: { user: User } }
  | { type: "LOGIN"; payload: { user: User } }
  | { type: "LOGOUT" };

const initialState: AuthState = {
  user: null,
  status: "loading",
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, user: action.payload.user, status: "authenticated" };
    case "LOGIN":
      return { ...state, user: action.payload.user, status: "authenticated" };
    case "LOGOUT":
      return { ...state, user: null, status: "unauthenticated" };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

type AuthContextValue = AuthState & {
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Bootstrap from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user) {
          dispatch({ type: "HYDRATE", payload: { user: parsed.user } });
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    dispatch({ type: "LOGOUT" });
  }, []);

  const login = useCallback(
    (user: User) => {
      localStorage.setItem("auth", JSON.stringify({ user }));
      dispatch({ type: "LOGIN", payload: { user } });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/internal/clear-token", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem("auth");
    dispatch({ type: "LOGOUT" });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
