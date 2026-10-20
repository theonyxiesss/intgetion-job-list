import { z } from "zod";
import { HttpError, unauthenticated } from "@/lib/http";
import { wrapUntrusted } from "@/lib/llm";
import { requireActiveUserById } from "@/modules/auth/service";
import {
  assertCanEditCompany,
  editCompany,
  getCompaniesForUser,
} from "@/modules/companies/service";
import { patchCompanyInput } from "@/modules/companies/schemas";
import type { BotTool, ToolContext } from "./tools";

/**
 * The person's own company card in Spoki (D511, 29.6): read it, and change
 * name, description, country, size and the company time zone on a card,
 * by the cabinet's rules (owner or admin; an imported company is read
 * only). Website, domain, legal details and the logo touch verification
 * and stay on the company page: Spoki gives the link.
 */

const SIZES = [
  "s1_10",
  "s11_50",
  "s51_200",
  "s201_1000",
  "s1000_plus",
] as const;
const DESCRIPTION_CHARS = 1500;

const input = z
  .object({
    companyId: z.uuid(),
    name: z.string().optional(),
    description: z.string().optional(),
    country: z.string().optional(),
    size: z.enum(SIZES).optional(),
    timezone: z.string().optional(),
  })
  .strict();

type Input = z.infer<typeof input>;

function user(ctx: ToolContext): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

async function account(ctx: ToolContext) {
  const row = await requireActiveUserById(user(ctx));
  if (!row) throw unauthenticated();
  return row;
}

/** Only the named fields, checked by the cabinet's own schema. */
export function namedCompanyPatch(patch: Omit<Input, "companyId">) {
  const named = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  if (!Object.keys(named).length)
    throw new HttpError(422, "VALIDATION_ERROR", "Name what to change");
  const parsed = patchCompanyInput.safeParse(named);
  if (!parsed.success)
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      `Ask the person for these fields: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  const data = parsed.data as Record<string, unknown>;
  if (typeof data.country === "string")
    data.country = data.country.toUpperCase();
  return Object.fromEntries(
    Object.keys(named).map((key) => [key, data[key]]),
  ) as Parameters<typeof editCompany>[2];
}

export const companyTools: BotTool[] = [
  {
    name: "get_my_company",
    description:
      "The person's own companies (as a member): name, role, status, description, country, size, time zone, website and links. Use when they ask about their company card.",
    input: z.object({}).strict(),
    access: "user",
    confirm: () => false,
    async run(ctx: ToolContext) {
      const rows = await getCompaniesForUser(user(ctx));
      if (!rows.length)
        return {
          llm: "No company yet. To create one, offer offer_step with post_job or company.",
        };
      return {
        llm: wrapUntrusted(
          "user_message",
          JSON.stringify(
            rows.map((row) => ({
              id: row.id,
              name: row.name,
              role: row.role,
              status: row.status,
              imported: row.origin === "imported",
              description: row.description?.slice(0, DESCRIPTION_CHARS) ?? null,
              country: row.country,
              size: row.size,
              timezone: row.timezone,
              website: row.websiteUrl,
              publicPage: `/companies/${row.slug}`,
              cabinet: "/employer/company",
            })),
          ),
        ),
      };
    },
  } as unknown as BotTool,
  {
    name: "propose_company_update",
    description:
      "Change the person's own company card by id from get_my_company: name, description, country (ISO-2), size (s1_10, s11_50, s51_200, s201_1000, s1000_plus) or the company time zone (IANA). Send only what they asked to change. Only an owner or admin may change it. Website, domain, legal details and the logo are changed on the company page: offer_step company. Confirmed on a card.",
    input,
    access: "user",
    confirm: () => true,
    async preview(ctx: ToolContext, patch: Input) {
      const { companyId, ...fields } = patch;
      namedCompanyPatch(fields);
      return (await assertCanEditCompany(companyId, await account(ctx))).name;
    },
    async run(ctx: ToolContext, patch: Input) {
      const { companyId, ...fields } = patch;
      const updated = await editCompany(
        companyId,
        await account(ctx),
        namedCompanyPatch(fields),
      );
      return {
        llm: `Company card updated: ${updated.name}. Public page: /companies/${updated.slug}.`,
      };
    },
  } as unknown as BotTool,
];
