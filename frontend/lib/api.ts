const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  statusCode: number;
  errors?: { field: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    errors?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export async function api<T>(
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

  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  // Only set Content-Type if there's a body and it's not FormData
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    credentials: "include",
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
