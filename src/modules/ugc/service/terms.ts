import { createHash } from "node:crypto";
import {
  UGC_LIMITS as L,
  type UgcPlatform,
  type UgcRights,
} from "@/config/ugc";
import { HttpError } from "@/lib/http";
import { UGC_ERRORS } from "./rules";
import type { Campaign } from "./records";

/**
 * What a creator agrees to (U3, TZ 48, D574). Taken from the brief when the
 * offer is made and kept on the invite, so a later edit of the brief texts
 * cannot change what the creator accepted.
 */
export type TermsSnapshot = {
  videos: 1;
  bountyMinor: string;
  deadline: string;
  rights: UgcRights;
  licenseMonths: number;
  territory: "worldwide";
  reviewBusinessDays: number;
  platforms: UgcPlatform[];
  mustSay: string;
  mustNot: string;
  pitch: string;
  exampleUrls: string[];
};

export function buildTerms(campaign: Campaign): TermsSnapshot {
  return {
    videos: 1,
    bountyMinor: campaign.bountyMinor.toString(),
    deadline: campaign.deadline,
    rights: campaign.rights,
    licenseMonths: L.licenseMonths,
    territory: "worldwide",
    reviewBusinessDays: L.reviewBusinessDays,
    platforms: [...campaign.platforms].sort(),
    mustSay: campaign.mustSay,
    mustNot: campaign.mustNot,
    pitch: campaign.pitch,
    exampleUrls: [...campaign.exampleUrls],
  };
}

/** Same terms, same hash: keys are fixed in order and nothing else is hashed. */
export function termsHash(terms: TermsSnapshot): string {
  const ordered = [
    terms.videos,
    terms.bountyMinor,
    terms.deadline,
    terms.rights,
    terms.licenseMonths,
    terms.territory,
    terms.reviewBusinessDays,
    terms.platforms,
    terms.mustSay,
    terms.mustNot,
    terms.pitch,
    terms.exampleUrls,
  ];
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

/**
 * Whether an offer may be accepted. An offer made before U3 has no snapshot
 * and is accepted as before. Otherwise the brief must still say what the offer
 * said, and a hash sent by the page must be the one the offer carries.
 */
export function assertTermsAgreed(input: {
  snapshotHash: string | null;
  current: TermsSnapshot;
  sentHash?: string;
}): string | null {
  if (!input.snapshotHash) return null;
  if (input.sentHash !== undefined && input.sentHash !== input.snapshotHash) {
    throw new HttpError(
      409,
      UGC_ERRORS.termsMismatch,
      "The terms on screen are not the terms of this offer",
    );
  }
  if (termsHash(input.current) !== input.snapshotHash) {
    throw new HttpError(
      409,
      UGC_ERRORS.termsChanged,
      "The brief changed after the offer was made",
    );
  }
  return input.snapshotHash;
}
