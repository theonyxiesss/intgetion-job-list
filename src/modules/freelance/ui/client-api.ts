/** Texts for freelance client components; built on the server from `freelance.client`. */
export type ClientCopy = Record<string, string>;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; details?: unknown };

/** JSON call to our own API; errors come back as a code, never thrown. */
export async function callApi<T>(
  url: string,
  body: unknown,
  method: "POST" | "PUT" = "POST",
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; details?: unknown };
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: payload?.error?.code ?? "INTERNAL",
        details: payload?.error?.details,
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, status: 0, code: "NETWORK" };
  }
}

/** The copy line for an error code, or the general failure line. */
export function errorText(copy: ClientCopy, code: string): string {
  return copy[`error_${code}`] ?? copy.failed ?? code;
}
