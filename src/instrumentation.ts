// src/instrumentation.ts
// Sentry instrumentation: only active when SENTRY_DSN is set.
// Reports errors via fetch to the Sentry envelope endpoint without PII.

function parseDsn(dsn: string): {
  protocol: string;
  host: string;
  projectId: string;
} {
  // Expected format: {protocol}://{publicKey}@{host}/{projectId}
  const protocolEnd = dsn.indexOf("://");
  if (protocolEnd === -1) {
    throw new Error("Invalid DSN: missing ://");
  }
  const protocol = dsn.substring(0, protocolEnd);
  const rest = dsn.substring(protocolEnd + 3); // after '://'

  const atIndex = rest.indexOf("@");
  if (atIndex === -1) {
    throw new Error("Invalid DSN: missing @");
  }
  // const publicKey = rest.substring(0, atIndex); // not needed for endpoint
  const restAfterAt = rest.substring(atIndex + 1);

  const slashIndex = restAfterAt.indexOf("/");
  if (slashIndex === -1) {
    throw new Error("Invalid DSN: missing /");
  }
  const host = restAfterAt.substring(0, slashIndex);
  const projectId = restAfterAt.substring(slashIndex + 1);

  return {
    protocol,
    host,
    projectId,
  };
}

/**
 * Sends an error event to Sentry via the envelope endpoint.
 * Only sends if SENTRY_DSN is set.
 * @param error - The error object or message.
 * @param request - The request object (from Next.js) to extract url and headers.
 */
export async function onRequestError(
  error: unknown,
  request: Request,
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // No DSN, do not send.
    return;
  }

  try {
    const { protocol, host, projectId } = parseDsn(dsn);
    const endpoint = `${protocol}//${host}/api/${projectId}/envelope/`;

    // Prepare the envelope items.
    // First item: envelope header.
    const envelopeHeader = JSON.stringify({
      dsn,
      // No SDK info to keep it simple.
    });

    // Second item: the error event.
    // We want to avoid PII: only message, path without query, and x-request-id.
    const url = request.url;
    const urlWithoutQuery = url.split("?")[0];
    const xRequestId = request.headers.get("x-request-id") ?? "";

    // Convert error to string, but if it's an Error, take the message.
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else {
      // Fallback to a generic string.
      message = "Unknown error";
    }

    const event = {
      event_id:
        crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      level: "error",
      message: message,
      // We don't send other fields like exception, stacktrace to avoid PII and keep it simple.
      // But we can add a minimal set of tags if needed.
      tags: {
        // We can add the x-request-id as a tag? But the instruction says to include in the body.
        // We'll put it in the event's `extra` or as a separate field?
        // Since the instruction says to include x-request-id (without specifying where),
        // we'll add it as a tag for simplicity.
        "x-request-id": xRequestId,
      },
      // We also include the URL without query as a top-level attribute? Or as a breadcrumb?
      // We'll add it as a top-level attribute for simplicity.
      url: urlWithoutQuery,
    };

    const eventItem = JSON.stringify(event);

    // Envelope format: each item is separated by a newline, and the whole envelope ends with a newline.
    // The header item has no data, just the header JSON.
    // The event item is a JSON string.
    const envelope = [envelopeHeader, eventItem].join("\n") + "\n";

    // Send via fetch.
    // We use keepalive? Not necessary for error reporting in Next.js.
    // We'll use fetch with method POST and the envelope as body.
    await fetch(endpoint, {
      method: "POST",
      body: envelope,
      // We set the Content-Type to application/x-sentry-envelope.
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
      // We don't want to delay the response, so we don't await the result?
      // But we are already in an async function and we want to wait for the send to complete.
      // However, if the endpoint is down, we don't want to hang. We'll set a timeout?
      // We'll rely on fetch's default timeout.
    });
  } catch {
    // If sending fails, we don't want to throw because we are in an error handler.
    // We can log to console, but we are avoiding PII in logs too?
    // We'll just silently drop the error to avoid causing another error.
    // In a real app, we might want to log to a local console, but we skip for now.
  }
}
