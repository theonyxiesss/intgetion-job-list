import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import {
  companyWorkspace,
  deskTotals,
  type DeskSection,
  type WorkspaceCampaign,
} from "@/modules/ugc/service";

export type DeskData = {
  userId: string;
  companies: { id: string; name: string }[];
  campaigns: WorkspaceCampaign[];
  /** Numbers next to nav items: only rows that wait on the company. */
  counts: Partial<Record<DeskSection, number>>;
};

/**
 * The signed-in person, before anything streams: a guest goes to sign-in
 * with a real redirect, like `/campaigns/new` (D519).
 */
export async function requireDeskUser(locale: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) {
    redirect({ href: "/login", locale });
    throw new Error("unreachable");
  }
  return user.id;
}

/**
 * What every page of the company's UGC workspace reads (D519). A person
 * without a company gets no campaigns and the pages show how to start one.
 */
export async function loadDesk(userId: string): Promise<DeskData> {
  const companies = (await getCompaniesForUser(userId)).map((row) => ({
    id: row.id,
    name: row.name,
  }));
  const campaigns = companies.length ? await companyWorkspace(userId) : [];
  return {
    userId,
    companies,
    campaigns,
    counts: deskCounts(campaigns),
  };
}

export function deskCounts(
  campaigns: readonly WorkspaceCampaign[],
): Partial<Record<DeskSection, number>> {
  const totals = deskTotals(campaigns);
  return {
    orders: totals.applied,
    materials: totals.waiting,
    payments: campaigns.filter((row) => row.progress.next === "deposit").length,
  };
}

/** A participant may get a hire offer from the page right now. */
export function offerOpen(campaign: WorkspaceCampaign): boolean {
  return (
    campaign.status === "open" &&
    (!campaign.deposit.required || campaign.deposit.paid)
  );
}

/** Where the brief's next step is done (D464 `next`). */
export function nextHref(campaign: WorkspaceCampaign): string {
  const next = campaign.progress.next;
  if (next === "deposit") return `/billing/crypto?ugc=${campaign.id}`;
  if (next === "decide") return `/campaigns/${campaign.id}#ugc-videos`;
  return `/campaigns/${campaign.id}#ugc-people`;
}

/** `ugcHub` key of the button that names the next step. */
export function nextKey(
  next: NonNullable<WorkspaceCampaign["progress"]["next"]>,
): "nextDeposit" | "nextHire" | "nextDecide" | "nextRemind" {
  return next === "deposit"
    ? "nextDeposit"
    : next === "hire"
      ? "nextHire"
      : next === "decide"
        ? "nextDecide"
        : "nextRemind";
}
