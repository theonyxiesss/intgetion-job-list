import {
  UGC_DELIVERY_PROBLEMS,
  UGC_LIMITS as L,
  type UgcDeliveryProblem,
} from "@/config/ugc";
import { validationError } from "@/lib/http";
import { assertNoContacts } from "./rules";

/**
 * Delivery of a physical product to the creator (U6, TZ 48 §8). The company
 * says it was sent; the creator says it arrived or that something is wrong.
 * Nothing is looked up at a carrier: the tracking number is text the company
 * typed. The delivery address is not stored here (see TZ 48 §25).
 */

export { UGC_DELIVERY_PROBLEMS, type UgcDeliveryProblem };

export type ShipmentInput = {
  carrier: string;
  tracking: string;
  /** `YYYY-MM-DD`, or empty when the company does not know. */
  expectedDate?: string | null;
};

export type ShipmentFields = {
  carrier: string;
  tracking: string;
  expectedDate: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Checks what the company typed and returns it cleaned. */
export function checkShipment(
  input: ShipmentInput,
  today: string,
): ShipmentFields {
  const carrier = input.carrier.trim();
  const tracking = input.tracking.trim();
  if (!carrier || carrier.length > L.carrierMax) {
    throw validationError([{ path: "carrier", problem: "length" }]);
  }
  if (!tracking || tracking.length > L.trackingMax) {
    throw validationError([{ path: "tracking", problem: "length" }]);
  }
  assertNoContacts(carrier, "carrier");
  assertNoContacts(tracking, "tracking");
  const raw = (input.expectedDate ?? "").trim();
  let expectedDate: string | null = null;
  if (raw) {
    const parsed = DATE.test(raw) ? Date.parse(`${raw}T00:00:00Z`) : NaN;
    const limit =
      Date.parse(`${today}T00:00:00Z`) + L.expectedDeliveryMaxDays * DAY_MS;
    if (Number.isNaN(parsed) || raw < today || parsed > limit) {
      throw validationError([{ path: "expectedDate", problem: "range" }]);
    }
    expectedDate = raw;
  }
  return { carrier, tracking, expectedDate };
}

export type DeliveryState = "shipped" | "received" | "problem";

/** The state shown to both sides, from the three marks the rows carry. */
export function deliveryState(row: {
  receivedAt: Date | null;
  problem: UgcDeliveryProblem | null;
}): DeliveryState {
  if (row.receivedAt) return "received";
  if (row.problem) return "problem";
  return "shipped";
}
