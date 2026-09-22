'use client';

export type ApiResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
};

export class ApiClientError extends Error {
  errors?: Record<string, string>;
  status: number;
  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

/** Wrapper fetch untuk semua pemanggilan API dari sisi klien. */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;
  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: 'same-origin',
  });

  let payload: ApiResult<T> | null = null;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(
      payload?.message ?? 'Terjadi kesalahan. Silakan coba lagi.',
      response.status,
      payload?.errors,
    );
  }
  return payload.data as T;
}
