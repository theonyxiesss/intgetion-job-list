import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ugcBriefDrafts } from "@/db/schema";
import {
  HttpError,
  notFound,
  unauthenticated,
  validationError,
} from "@/lib/http";
import {
  getCompaniesForUser,
  findMemberRole,
} from "@/modules/companies/service";
import { UGC_GOALS, UGC_NICHES, UGC_PLATFORMS, UGC_RIGHTS } from "@/config/ugc";
import { createCampaign, withdrawCampaign } from "./commands";

export type BriefDraft = Record<string, unknown>;
export type BriefDraftRow = {
  id: string;
  companyId: string | null;
  draft: BriefDraft;
  assumptions: string[];
  missingRequired: string[];
  companies: { id: string; name: string }[];
};

const REQUIRED = [
  "productName",
  "description",
  "goal",
  "platform",
  "videoCount",
  "rewardCents",
  "deadline",
  "rights",
] as const;
const text = (value: unknown, min: number, max: number) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;
const hasValues = (value: unknown) => Array.isArray(value) && value.length > 0;
const localeLanguage = (locale?: string) => {
  const code = locale?.split("-")[0]?.toLowerCase();
  return code && /^[a-z]{2}$/.test(code) ? code : "en";
};

export function mergeBriefPatch(
  current: BriefDraft,
  patch: BriefDraft,
): BriefDraft {
  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    ),
  };
}

export function normalizedLanguages(values: readonly string[]): string[] {
  const names: Record<string, string> = {
    italian: "it",
    italiano: "it",
    spanish: "es",
    español: "es",
    espanol: "es",
    russian: "ru",
    русский: "ru",
    german: "de",
    deutsch: "de",
    english: "en",
    ingles: "en",
    inglés: "en",
    french: "fr",
    français: "fr",
    portugues: "pt",
    português: "pt",
    portuguese: "pt",
    dutch: "nl",
    japanese: "ja",
    chinese: "zh",
    arabic: "ar",
    hindi: "hi",
  };
  return [
    ...new Set(
      values
        .map(
          (value) =>
            names[value.trim().toLocaleLowerCase()] ??
            value.trim().toLowerCase(),
        )
        .filter((value) => /^[a-z]{2}$/.test(value)),
    ),
  ];
}

export function isExplicitBriefConfirmation(value: string): boolean {
  const text = value.trim().toLocaleLowerCase();
  if (
    /\b(?:не|нет|no|not|don't|dont|не надо|пока нет|не запускай)\b/.test(text)
  )
    return false;
  return /^(?:да|давай|подтверждаю|запускай|запустить|ок|okay|yes|yep|launch|confirm)(?:$|[\s,.!])/i.test(
    text,
  );
}

export function isExplicitDraftReset(value: string): boolean {
  return /(?:начать заново|сброси(?:ть)? черновик|очисти черновик|новый продукт|другой продукт|теперь.+(?:вместо|не приложение|не магазин|не сервис)|start over|reset the draft|new product|different product)/i.test(
    value,
  );
}

export function unconfirmedBriefRanges(
  userText: string,
  patch: BriefDraft,
): { field: string; low: number; high: number; proposal: number }[] {
  const ranges: {
    field: string;
    low: number;
    high: number;
    proposal: number;
  }[] = [];
  const video = userText.match(
    /\b(\d+)\s*[-–—]\s*(\d+)\s*(?:видео|ролик\p{L}*|videos?|clips?)(?=\s|$|[,.;!?])/iu,
  );
  if (video && patch.videoCount !== undefined) {
    const low = Number(video[1]);
    const high = Number(video[2]);
    const proposal = Math.round((low + high) / 2);
    const accepted = new RegExp(
      `(?:ок|да|давай|ставь|выбери|бер[её]м|соглас(?:ен|на)|use|choose|set|take)[^.!?]{0,18}\\b${Number(patch.videoCount)}\\b|\\b${Number(patch.videoCount)}\\b[^.!?]{0,18}(?:ок|подходит|да|works|okay)`,
      "i",
    ).test(userText);
    if (!accepted) ranges.push({ field: "videoCount", low, high, proposal });
  }
  const price = userText.match(
    /(?:\$\s*(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*\$?\s*(\d+(?:[.,]\d+)?))|(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:\$|usd|доллар\w*|бакс\w*))/i,
  );
  if (price && patch.rewardCents !== undefined) {
    const low = Number((price[1] ?? price[3]).replace(",", "."));
    const high = Number((price[2] ?? price[4]).replace(",", "."));
    const proposal = Math.round(((low + high) / 2) * 100);
    const accepted = new RegExp(
      `(?:ок|да|давай|ставь|выбери|бер[её]м|бери|соглас(?:ен|на)|use|choose|set|take)[^.!?]{0,18}\\b${Number(patch.rewardCents) / 100}\\b|\\b${Number(patch.rewardCents) / 100}\\b[^.!?]{0,18}(?:ок|подходит|да|works|okay)`,
      "i",
    ).test(userText);
    if (!accepted)
      ranges.push({
        field: "rewardCents",
        low: Math.round(low * 100),
        high: Math.round(high * 100),
        proposal,
      });
  }
  return ranges;
}

export function missingBriefFields(draft: BriefDraft): string[] {
  const missing: string[] = REQUIRED.filter((key) => {
    const value = draft[key];
    if (key === "goal") return !UGC_GOALS.includes(value as never);
    if (key === "platform") return !UGC_PLATFORMS.includes(value as never);
    if (key === "rights") return !UGC_RIGHTS.includes(value as never);
    if (key === "videoCount")
      return (
        !Number.isInteger(value) || Number(value) < 1 || Number(value) > 30
      );
    if (key === "rewardCents")
      return (
        !Number.isInteger(value) || Number(value) < 500 || Number(value) > 50000
      );
    if (key === "deadline")
      return (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        value < new Date().toISOString().slice(0, 10)
      );
    return !text(value, 1, key === "productName" ? 120 : 400);
  });
  const countries = Array.isArray(draft.countries) ? draft.countries : [];
  if (!text(draft.audience, 1, 300) && countries.length === 0)
    missing.push("audienceOrCountry");
  return missing;
}

function validatePatch(patch: BriefDraft) {
  const allowed = new Set([
    "productName",
    "description",
    "goal",
    "audience",
    "countries",
    "languages",
    "platform",
    "niche",
    "mustSay",
    "mustNot",
    "videoCount",
    "rewardCents",
    "deadline",
    "rights",
    "pitch",
    "links",
  ]);
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.has(key) || value === null || value === undefined) continue;
    const invalid =
      key === "productName"
        ? !text(value, 1, 120)
        : key === "description" || key === "audience"
          ? !text(value, 1, 400)
          : key === "goal"
            ? !UGC_GOALS.includes(value as never)
            : key === "platform"
              ? !UGC_PLATFORMS.includes(value as never)
              : key === "niche"
                ? !UGC_NICHES.includes(value as never)
                : key === "rights"
                  ? !UGC_RIGHTS.includes(value as never)
                  : key === "videoCount"
                    ? !Number.isInteger(value) ||
                      Number(value) < 1 ||
                      Number(value) > 30
                    : key === "rewardCents"
                      ? !Number.isInteger(value) ||
                        Number(value) < 500 ||
                        Number(value) > 50000
                      : key === "deadline"
                        ? typeof value !== "string" ||
                          !/^\d{4}-\d{2}-\d{2}$/.test(value)
                        : key === "countries"
                          ? !Array.isArray(value) ||
                            value.length > 20 ||
                            value.some(
                              (x) =>
                                typeof x !== "string" || !/^[A-Z]{2}$/.test(x),
                            )
                          : key === "languages"
                            ? !Array.isArray(value) ||
                              value.length > 20 ||
                              normalizedLanguages(value as string[]).length !==
                                value.length
                            : key === "links"
                              ? !Array.isArray(value) ||
                                value.length > 5 ||
                                value.some(
                                  (x) =>
                                    typeof x !== "string" || x.length > 500,
                                )
                              : key === "mustSay" || key === "mustNot"
                                ? !Array.isArray(value) ||
                                  value.length > 30 ||
                                  value.some(
                                    (x) =>
                                      typeof x !== "string" || x.length > 200,
                                  )
                                : key === "pitch"
                                  ? !text(value, 0, 300)
                                  : false;
    if (invalid) throw validationError([{ path: key, problem: "invalid" }]);
  }
}

async function ownedDraft(userId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(ugcBriefDrafts)
    .where(and(eq(ugcBriefDrafts.id, id), eq(ugcBriefDrafts.userId, userId)))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

export async function readBriefDraft(
  userId: string | null,
  draftId?: string,
): Promise<BriefDraftRow> {
  if (!userId) throw unauthenticated();
  const companies = await getCompaniesForUser(userId);
  const db = getDb();
  let row;
  if (draftId) row = await ownedDraft(userId, draftId);
  else {
    [row] = await db
      .select()
      .from(ugcBriefDrafts)
      .where(eq(ugcBriefDrafts.userId, userId))
      .orderBy(desc(ugcBriefDrafts.updatedAt))
      .limit(1);
    if (!row) {
      const company = companies.length === 1 ? companies[0] : undefined;
      [row] = await db
        .insert(ugcBriefDrafts)
        .values({ userId, companyId: company?.id ?? null })
        .onConflictDoNothing({ target: ugcBriefDrafts.userId })
        .returning();
      if (!row)
        [row] = await db
          .select()
          .from(ugcBriefDrafts)
          .where(eq(ugcBriefDrafts.userId, userId))
          .limit(1);
    }
  }
  if (
    row.companyId &&
    !companies.some((company) => company.id === row!.companyId)
  )
    throw notFound();
  const draft = row.draft ?? {};
  const missingRequired = missingBriefFields(draft);
  if (!row.companyId) missingRequired.push("companyId");
  return {
    id: row.id,
    companyId: row.companyId,
    draft,
    assumptions: row.assumptions ?? [],
    missingRequired,
    companies: companies.map(({ id, name }) => ({ id, name })),
  };
}

export async function patchBriefDraft(
  userId: string | null,
  input: {
    draftId?: string;
    companyId?: string;
    patch: BriefDraft;
    useDefaults?: boolean;
    locale?: string;
    requestedDefaults?: boolean;
  },
) {
  if (!userId) throw unauthenticated();
  validatePatch(input.patch);
  const current = await readBriefDraft(userId, input.draftId);
  const companyId = input.companyId ?? current.companyId;
  if (companyId && !(await findMemberRole(companyId, userId))) throw notFound();
  const draft = mergeBriefPatch(current.draft, input.patch);
  if (Array.isArray(draft.languages))
    draft.languages = normalizedLanguages(draft.languages as string[]);
  const changedKeys = new Set(Object.keys(input.patch));
  const assumptions = current.assumptions.filter(
    (item) => ![...changedKeys].some((key) => item.startsWith(`${key}:`)),
  );
  if (input.requestedDefaults && text(draft.productName, 1, 120)) {
    const niche = /shop|store|магазин|e-?commerce/i.test(
      `${draft.description ?? ""} ${draft.productName}`,
    )
      ? "ecommerce"
      : "other";
    if (!draft.niche) {
      draft.niche = niche;
      assumptions.push(`niche: assumed ${niche}.`);
    }
    if (!hasValues(draft.languages)) {
      draft.languages = [localeLanguage(input.locale)];
      assumptions.push(
        `languages: assumed ${(draft.languages as string[])[0]}.`,
      );
    }
    if (!hasValues(draft.mustSay)) {
      draft.mustSay = [String(draft.productName)];
      assumptions.push("mustSay: include the product name.");
    }
    if (!hasValues(draft.mustNot)) {
      draft.mustNot = ["Other brands", "Unsupported claims"];
      assumptions.push("mustNot: avoid other brands and unsupported claims.");
    }
    if (
      niche === "ecommerce" &&
      (!draft.platform || draft.platform === "reels")
    ) {
      const localDate = new Date();
      localDate.setUTCDate(localDate.getUTCDate() + 14);
      const defaults: Record<string, unknown> = {
        goal: "purchases",
        platform: "reels",
        videoCount: 6,
        rewardCents: 6000,
        deadline: localDate.toISOString().slice(0, 10),
        rights: "ads",
      };
      for (const [key, value] of Object.entries(defaults))
        if (draft[key] === undefined) {
          draft[key] = value;
          assumptions.push(`${key}: defaulted for ecommerce + Reels.`);
        }
    }
  } else if (missingBriefFields(draft).length === 0) {
    if (!draft.niche) {
      draft.niche = /shop|store|магазин|e-?commerce/i.test(
        `${draft.description ?? ""} ${draft.productName}`,
      )
        ? "ecommerce"
        : "other";
      assumptions.push(`niche: assumed ${draft.niche}.`);
    }
    if (!hasValues(draft.languages)) {
      draft.languages = [localeLanguage(input.locale)];
      assumptions.push(
        `languages: assumed ${(draft.languages as string[])[0]}.`,
      );
    }
    if (!hasValues(draft.mustSay)) {
      draft.mustSay = [String(draft.productName)];
      assumptions.push("mustSay: include the product name.");
    }
    if (!hasValues(draft.mustNot)) {
      draft.mustNot = ["Other brands", "Unsupported claims"];
      assumptions.push("mustNot: avoid other brands and unsupported claims.");
    }
  }
  const [row] = await getDb()
    .update(ugcBriefDrafts)
    .set({ companyId, draft, assumptions, updatedAt: new Date() })
    .where(
      and(eq(ugcBriefDrafts.id, current.id), eq(ugcBriefDrafts.userId, userId)),
    )
    .returning();
  const missingRequired = missingBriefFields(row.draft);
  if (!row.companyId) missingRequired.push("companyId");
  return {
    id: row.id,
    companyId: row.companyId,
    draft: row.draft,
    assumptions: row.assumptions,
    missingRequired,
    companies: current.companies,
  };
}

export async function resetBriefDraft(
  userId: string | null,
  draftId?: string,
  patch: BriefDraft = {},
) {
  if (!userId) throw unauthenticated();
  validatePatch(patch);
  const current = await readBriefDraft(userId, draftId);
  const draft = mergeBriefPatch({}, patch);
  const [row] = await getDb()
    .update(ugcBriefDrafts)
    .set({
      companyId: current.companyId,
      draft,
      assumptions: [],
      updatedAt: new Date(),
    })
    .where(
      and(eq(ugcBriefDrafts.id, current.id), eq(ugcBriefDrafts.userId, userId)),
    )
    .returning();
  const missingRequired = missingBriefFields(draft);
  if (!row.companyId) missingRequired.push("companyId");
  return {
    id: row.id,
    companyId: row.companyId,
    draft,
    assumptions: [],
    missingRequired,
    companies: current.companies,
  };
}

export async function confirmBriefDraft(
  userId: string | null,
  draftId?: string,
) {
  if (!userId) throw unauthenticated();
  const current = await readBriefDraft(userId, draftId);
  const missing = missingBriefFields(current.draft);
  if (!current.companyId) missing.push("companyId");
  if (missing.length || !current.companyId)
    throw validationError([
      { path: missing[0] ?? "companyId", problem: "required" },
    ]);
  const d = current.draft;
  const countries = Array.isArray(d.countries) ? (d.countries as string[]) : [];
  const languages = Array.isArray(d.languages) ? (d.languages as string[]) : [];
  const mustSay = Array.isArray(d.mustSay) ? (d.mustSay as string[]) : [];
  const mustNot = Array.isArray(d.mustNot) ? (d.mustNot as string[]) : [];
  const links = Array.isArray(d.links) ? (d.links as string[]) : [];
  const result = await createCampaign(userId, {
    companyId: current.companyId,
    productName: String(d.productName),
    productSummary: String(d.description),
    goal: d.goal as never,
    niches: [d.niche as never],
    audience: text(d.audience, 1, 300) ? String(d.audience) : "Any audience",
    country: countries[0] ?? null,
    countries,
    languages: languages.length ? languages : ["en"],
    mustSay: mustSay.join("; ") || String(d.productName),
    mustNot: mustNot.join("; ") || "No unsupported or misleading claims.",
    platforms: [d.platform as never],
    videosWanted: Number(d.videoCount),
    bountyMinor: BigInt(Number(d.rewardCents)),
    deadline: String(d.deadline),
    rights: d.rights as never,
    pitch: typeof d.pitch === "string" ? d.pitch : "",
    exampleUrls: links,
  });
  await getDb()
    .delete(ugcBriefDrafts)
    .where(
      and(eq(ugcBriefDrafts.id, current.id), eq(ugcBriefDrafts.userId, userId)),
    );
  return { ...result, productName: String(d.productName) };
}

/**
 * A brief taken back from review becomes the person's draft again (D512),
 * the reverse of `confirmBriefDraft`. An unsent draft of their own is not
 * overwritten: they send or reset it first.
 */
export async function withdrawToDraft(
  userId: string | null,
  campaignId: string,
) {
  if (!userId) throw unauthenticated();
  return withdrawCampaign(userId, campaignId, async (campaign) => {
    const [current] = await getDb()
      .select()
      .from(ugcBriefDrafts)
      .where(eq(ugcBriefDrafts.userId, userId))
      .limit(1);
    if (current && Object.keys(current.draft ?? {}).length > 0)
      throw new HttpError(
        409,
        "UGC_DRAFT_IN_PROGRESS",
        "Send or reset the unsent brief draft first",
      );
    const split = (value: string) =>
      value
        .split(/;\s*/)
        .map((item) => item.trim())
        .filter(Boolean);
    const draft: BriefDraft = {
      productName: campaign.productName,
      description: campaign.productSummary,
      goal: campaign.goal,
      niche: campaign.niches[0],
      audience: campaign.audience,
      countries: campaign.countries ?? [],
      languages: campaign.languages,
      mustSay: split(campaign.mustSay),
      mustNot: split(campaign.mustNot),
      platform: campaign.platforms[0],
      videoCount: campaign.videosWanted,
      rewardCents: Number(campaign.bountyMinor),
      deadline: campaign.deadline,
      rights: campaign.rights,
      pitch: campaign.pitch,
      links: campaign.exampleUrls,
    };
    await getDb()
      .insert(ugcBriefDrafts)
      .values({ userId, companyId: campaign.companyId, draft, assumptions: [] })
      .onConflictDoUpdate({
        target: ugcBriefDrafts.userId,
        set: {
          companyId: campaign.companyId,
          draft,
          assumptions: [],
          updatedAt: new Date(),
        },
      });
  });
}
