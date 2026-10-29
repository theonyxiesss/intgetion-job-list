import type { Campaign, CampaignVersion } from "./records";

/** The brief texts a company may change while the brief is open (D512, U3б). */
export const BRIEF_TEXT_FIELDS = [
  "productSummary",
  "pitch",
  "mustSay",
  "mustNot",
  "exampleUrls",
  "questions",
] as const;
export type BriefTextField = (typeof BRIEF_TEXT_FIELDS)[number];

export type BriefTextSnapshot = {
  productSummary: string;
  pitch: string;
  mustSay: string;
  mustNot: string;
  exampleUrls: string[];
  questions: string[];
};

export function textSnapshot(campaign: Campaign): BriefTextSnapshot {
  return {
    productSummary: campaign.productSummary,
    pitch: campaign.pitch,
    mustSay: campaign.mustSay,
    mustNot: campaign.mustNot,
    exampleUrls: [...campaign.exampleUrls],
    questions: [...(campaign.questions ?? [])],
  };
}

/** Which texts differ between two states of a brief, in a fixed order. */
export function changedFields(
  before: BriefTextSnapshot,
  after: BriefTextSnapshot,
): BriefTextField[] {
  return BRIEF_TEXT_FIELDS.filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  );
}

/**
 * The rows to write for one saved change: the first change also stores the
 * state the brief had before it, as version 1, so the history starts from
 * what creators first saw. Nothing is written when no text differs.
 */
export function versionRows(input: {
  campaignId: string;
  existing: readonly Pick<CampaignVersion, "version">[];
  before: Campaign;
  after: Campaign;
  changedBy: string;
  at: Date;
  newId: () => string;
}): CampaignVersion[] {
  const before = textSnapshot(input.before);
  const after = textSnapshot(input.after);
  const fields = changedFields(before, after);
  if (fields.length === 0) return [];
  const rows: CampaignVersion[] = [];
  let next = input.existing.reduce((max, row) => Math.max(max, row.version), 0);
  if (next === 0) {
    next = 1;
    rows.push({
      id: input.newId(),
      campaignId: input.campaignId,
      version: 1,
      changedBy: input.before.createdBy,
      changedFields: [],
      snapshot: before,
      createdAt: input.before.createdAt,
    });
  }
  rows.push({
    id: input.newId(),
    campaignId: input.campaignId,
    version: next + 1,
    changedBy: input.changedBy,
    changedFields: fields,
    snapshot: after,
    createdAt: input.at,
  });
  return rows;
}
