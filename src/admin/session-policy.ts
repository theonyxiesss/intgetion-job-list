/** Idle timeout, absolute lifetime, and step-up window (ADMIN.md 3.2). */

export const ADMIN_IDLE_MS = 30 * 60 * 1000;
export const ADMIN_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const ADMIN_STEP_UP_MS = 10 * 60 * 1000;

export function sessionAlive(
  createdAt: Date,
  lastSeenAt: Date,
  now: Date,
): boolean {
  if (now.getTime() - lastSeenAt.getTime() > ADMIN_IDLE_MS) return false;
  if (now.getTime() - createdAt.getTime() > ADMIN_ABSOLUTE_MS) return false;
  return true;
}

export function stepUpFresh(lastStepUpAt: Date | null, now: Date): boolean {
  if (!lastStepUpAt) return false;
  return now.getTime() - lastStepUpAt.getTime() <= ADMIN_STEP_UP_MS;
}

export type DeviceClass = "phone" | "tablet" | "desktop" | "unknown";

export function deviceClassOf(userAgent: string | null): DeviceClass {
  if (!userAgent) return "unknown";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobile|iPhone|Android/i.test(userAgent)) return "phone";
  return "desktop";
}

/** Country from the Vercel edge header. Anything else is dropped. */
export function countryFromHeader(value: string | null): string | null {
  const country = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(country) ? country : null;
}
