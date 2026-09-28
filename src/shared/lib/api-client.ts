/**
 * Client transport for the Web API (NOTE-07 onward). Unwraps the `{ data }`
 * envelope and turns a non-2xx `{ error: { code, message } }` response into a
 * typed `ApiError` the TanStack Query hooks (and their consumers) can branch on.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = (payload as ErrorEnvelope | null)?.error;
    throw new ApiError(
      response.status,
      envelope?.code ?? "UNKNOWN",
      envelope?.message ?? "Request failed",
    );
  }

  return (payload as { data: T }).data;
}
