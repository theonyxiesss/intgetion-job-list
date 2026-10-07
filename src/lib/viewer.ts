import { headers } from "next/headers";
import type { AccountType } from "@/config/account";
import { requireUser } from "@/lib/auth-guards";
import { hasSessionMark } from "@/lib/supabase/session-mark";

/**
 * Who is looking at the page (D334): a guest, or a signed-in user with the
 * soft account type chosen at registration (D331). Pages use it to show one
 * audience instead of «for candidates / for companies» switches. It never
 * grants anything: permissions stay with company membership (D13).
 */
export type Viewer = { kind: "guest" } | { kind: AccountType; userId: string };

export async function getViewer(): Promise<Viewer> {
  // The proxy marks a checked session (D41); without it, skip the lookup.
  if (!hasSessionMark(await headers())) return { kind: "guest" };
  try {
    const user = await requireUser();
    return { kind: user.accountType, userId: user.id };
  } catch {
    return { kind: "guest" };
  }
}

/** Pricing audience (D334): a signed-in user's own side; a guest picks. */
export function pricingAudienceFor(
  kind: Viewer["kind"],
  requested: string | undefined,
): "candidates" | "companies" {
  if (kind === "employer") return "companies";
  if (kind === "candidate") return "candidates";
  return requested === "companies" ? "companies" : "candidates";
}
