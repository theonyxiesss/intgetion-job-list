import { UGC_LIMITS } from "@/config/ugc";

/**
 * Price guide for UGC videos (D464). A company sets the reward per accepted
 * video itself; the guide only shows what others set. Nothing here charges.
 */

/** Ready amounts to pick from, in cents: $25, $50, $100, $200. */
export const UGC_PRICE_PRESETS = [2500, 5000, 10000, 20000] as const;

/** The preset shown as "most often" until real briefs say otherwise. */
export const UGC_PRICE_DEFAULT = 5000;

/** Fewer reviewed briefs than this and the guide falls back to presets. */
export const UGC_RANGE_MIN_COUNT = 3;

/**
 * Hint only, not a rule: a video that runs as a paid ad or from the brand's
 * account is usually priced higher than an organic post.
 */
export const UGC_RIGHTS_HINT = {
  organic: 1,
  ads: 1.5,
  whitelist: 2,
} as const;

export type UgcPriceGuide = {
  /** `briefs` when built from reviewed briefs, `presets` otherwise. */
  source: "briefs" | "presets";
  count: number;
  minMinor: number;
  medianMinor: number;
  maxMinor: number;
  presets: readonly number[];
};

export type BountyRow = {
  bountyMinor: bigint;
  niches: readonly string[];
  platforms: readonly string[];
};

function median(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

/**
 * Min, median and max reward of reviewed briefs that share the niche and the
 * platform when they are given. Below three briefs: the presets.
 */
export function priceGuide(
  rows: readonly BountyRow[],
  filter: { niche?: string; platform?: string } = {},
): UgcPriceGuide {
  const prices = rows
    .filter(
      (row) =>
        (!filter.niche || row.niches.includes(filter.niche)) &&
        (!filter.platform || row.platforms.includes(filter.platform)),
    )
    .map((row) => Number(row.bountyMinor))
    .sort((a, b) => a - b);
  if (prices.length < UGC_RANGE_MIN_COUNT) {
    return {
      source: "presets",
      count: prices.length,
      minMinor: UGC_PRICE_PRESETS[0],
      medianMinor: UGC_PRICE_DEFAULT,
      maxMinor: UGC_PRICE_PRESETS[UGC_PRICE_PRESETS.length - 1]!,
      presets: UGC_PRICE_PRESETS,
    };
  }
  return {
    source: "briefs",
    count: prices.length,
    minMinor: prices[0]!,
    medianMinor: median(prices),
    maxMinor: prices[prices.length - 1]!,
    presets: UGC_PRICE_PRESETS,
  };
}

/** The whole budget of a brief: videos × reward, in cents. */
export function ugcBudgetMinor(videos: number, bountyMinor: number): number {
  if (!Number.isInteger(videos) || videos < 1) return 0;
  if (!Number.isInteger(bountyMinor) || bountyMinor < 0) return 0;
  return videos * bountyMinor;
}

/** A reward the brief accepts: $5–$500 (27.11). */
export function rewardInLimits(bountyMinor: number): boolean {
  return (
    bountyMinor >= Number(UGC_LIMITS.bountyMinMinor) &&
    bountyMinor <= Number(UGC_LIMITS.bountyMaxMinor)
  );
}

/** "$50" from 5000 cents; whole dollars when even. */
export function usdLabel(minor: number): string {
  const whole = Math.floor(minor / 100);
  const cents = minor % 100;
  return cents === 0
    ? `$${whole}`
    : `$${whole}.${String(cents).padStart(2, "0")}`;
}
