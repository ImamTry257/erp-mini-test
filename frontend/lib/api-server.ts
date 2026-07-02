import { cookies } from "next/headers";
import { ApiError } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiServer<T>(
  path: string,
  options: RequestInit & { params?: Record<string, unknown> } = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.set(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Read auth token from cookie (server-side)
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new ApiError(
      json.statusCode ?? res.status,
      json.string ?? json.message ?? "Request failed",
      json.errors
    );
  }

  return (json.data ?? json) as T;
}
