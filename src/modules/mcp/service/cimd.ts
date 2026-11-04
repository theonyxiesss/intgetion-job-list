import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";

const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 2500;

function inV4(address: string, base: string, bits: number): boolean {
  const zero = BigInt(0);
  const value = address
    .split(".")
    .reduce((n, part) => (n << BigInt(8)) | BigInt(part), zero);
  const network = base
    .split(".")
    .reduce((n, part) => (n << BigInt(8)) | BigInt(part), zero);
  const mask =
    bits === 0
      ? zero
      : ((BigInt(1) << BigInt(bits)) - BigInt(1)) << BigInt(32 - bits);
  return (value & mask) === (network & mask);
}

export function isPublicCimdAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const blocked = [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.88.99.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ] as const;
    return !blocked.some(([base, bits]) => inV4(address, base, bits));
  }
  if (family !== 6) return false;
  const normalized = address.toLowerCase().split("%", 1)[0];
  if (normalized === "::" || normalized === "::1" || normalized.includes("."))
    return false;
  const first = Number.parseInt(normalized.split(":")[0] || "0", 16);
  // Conservatively allow only global-unicast 2000::/3 and exclude special-use ranges.
  if ((first & 0xe000) !== 0x2000) return false;
  const expanded = expandV6(normalized);
  if (!expanded) return false;
  const value = expanded.reduce(
    (n, part) => (n << BigInt(16)) | BigInt(`0x${part}`),
    BigInt(0),
  );
  const blocked = [
    ["2001:db8::", 32],
    ["2001:10::", 28],
    ["2001::", 23],
    ["2002::", 16],
    ["3fff::", 20],
  ] as const;
  return !blocked.some(([base, bits]) => inV6(value, base, bits));
}

function expandV6(address: string): string[] | null {
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  )
    return null;
  const parts = [...left, ...Array(missing).fill("0"), ...right];
  return parts.length === 8 &&
    parts.every((part) => /^[\da-f]{1,4}$/i.test(part))
    ? parts
    : null;
}

function inV6(value: bigint, base: string, bits: number): boolean {
  const parts = expandV6(base);
  if (!parts) return false;
  const network = parts.reduce(
    (n, part) => (n << BigInt(16)) | BigInt(`0x${part}`),
    BigInt(0),
  );
  const mask = ((BigInt(1) << BigInt(bits)) - BigInt(1)) << BigInt(128 - bits);
  return (value & mask) === (network & mask);
}

export function validateCimdUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.port ||
      url.hostname.length > 253 ||
      value.length > 2048 ||
      isIP(url.hostname.replace(/^\[|\]$/g, ""))
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

export type CimdDocument = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  [key: string]: unknown;
};

export function validateCimdDocument(
  value: unknown,
  expectedId: string,
): CimdDocument | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const doc = value as Record<string, unknown>;
  if (
    doc.client_id !== expectedId ||
    typeof doc.client_name !== "string" ||
    doc.client_name.trim().length < 1 ||
    doc.client_name.length > 100 ||
    !Array.isArray(doc.redirect_uris) ||
    doc.redirect_uris.length < 1 ||
    doc.redirect_uris.length > 10 ||
    doc.redirect_uris.some((uri) => typeof uri !== "string") ||
    Object.keys(doc).length > 32 ||
    JSON.stringify(doc).length > 8192
  )
    return null;
  const redirectUris = doc.redirect_uris as string[];
  if (
    redirectUris.some((uri) => {
      try {
        const parsed = new URL(uri);
        return (
          !!parsed.hash ||
          !!parsed.username ||
          !!parsed.password ||
          !(
            parsed.protocol === "https:" ||
            (parsed.protocol === "http:" &&
              ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
          )
        );
      } catch {
        return true;
      }
    })
  )
    return null;
  return {
    ...doc,
    client_id: expectedId,
    client_name: doc.client_name.trim(),
    redirect_uris: [...new Set(redirectUris)],
  };
}

export async function fetchCimdDocument(
  clientId: string,
): Promise<CimdDocument | null> {
  const url = validateCimdUrl(clientId);
  if (!url) return null;
  let addresses: Awaited<ReturnType<typeof lookup>>[];
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    return null;
  }
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicCimdAddress(address))
  )
    return null;
  const pinned = addresses[0];
  if (!pinned) return null;
  const bytes = await new Promise<Buffer | null>((resolve) => {
    let settled = false;
    const finish = (value: Buffer | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(totalTimeout);
      resolve(value);
    };
    const totalTimeout = setTimeout(() => {
      req.destroy();
      finish(null);
    }, TIMEOUT_MS);
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": "INTGETION-MCP/1",
        },
        timeout: TIMEOUT_MS,
        lookup: (_hostname, _options, callback) =>
          callback(null, pinned.address, pinned.family),
      },
      (res) => {
        if (
          res.statusCode !== 200 ||
          !/^application\/(?:json|.+\+json)(?:\s*;|$)/i.test(
            res.headers["content-type"] ?? "",
          )
        ) {
          res.destroy();
          finish(null);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            finish(null);
          } else chunks.push(chunk);
        });
        res.on("end", () => finish(Buffer.concat(chunks)));
        res.on("error", () => finish(null));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      finish(null);
    });
    req.on("error", () => finish(null));
    req.end();
  });
  if (!bytes) return null;
  try {
    return validateCimdDocument(JSON.parse(bytes.toString("utf8")), clientId);
  } catch {
    return null;
  }
}
