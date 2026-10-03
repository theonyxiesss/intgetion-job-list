import { HttpError, validationError } from "./errors";

/** 413 when a request body is larger than the route accepts (D47). */
export function payloadTooLarge(maxBytes: number): HttpError {
  return new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large", {
    maxBytes,
  });
}

/**
 * Reads the body as a stream and stops as soon as it passes `maxBytes`, so
 * an oversized upload never sits in memory whole. A declared
 * Content-Length over the limit is refused before reading anything.
 */
export async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw payloadTooLarge(maxBytes);
  }
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw payloadTooLarge(maxBytes);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** multipart/form-data with the same streaming limit; a broken body is 400. */
export async function readFormDataLimited(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  const body = await readBodyLimited(request, maxBytes);
  const buffered = new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") ?? "" },
    body,
  });
  try {
    return await buffered.formData();
  } catch {
    throw validationError([{ path: [], message: "invalid_form_data" }]);
  }
}
