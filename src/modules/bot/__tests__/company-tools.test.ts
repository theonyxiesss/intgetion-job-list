import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbidden, HttpError } from "@/lib/http";

const companies = vi.hoisted(() => ({
  assertCanEditCompany: vi.fn(),
  editCompany: vi.fn(),
  getCompaniesForUser: vi.fn(),
}));

vi.mock("@/modules/companies/service", async (o) => ({
  ...(await o<object>()),
  ...companies,
}));
vi.mock("@/modules/auth/service", async (o) => ({
  ...(await o<object>()),
  requireActiveUserById: vi.fn(async (id: string) => ({ id })),
}));

const { ACCOUNT_CARD_TOOLS } = await import("@/components/bot/account-card");
const { offerPath } = await import("../service/offers");
const { namedCompanyPatch } = await import("../service/company-tools");
const { findTool, hashArgs, runTool, toolPreview, toolsFor } =
  await import("../service/tools");

const COMPANY = "00000000-0000-4000-8000-0000000000c1";
const ctx = { userId: "u1", conversationId: "c1", locale: "ru", state: {} };

function confirmed(args: unknown) {
  return {
    tool: "propose_company_update",
    userId: "u1",
    argsHash: hashArgs("propose_company_update", args),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  companies.assertCanEditCompany.mockResolvedValue({ name: "Acme" });
  companies.editCompany.mockResolvedValue({ name: "Acme Labs", slug: "acme" });
  companies.getCompaniesForUser.mockResolvedValue([
    {
      id: COMPANY,
      name: "Acme",
      slug: "acme",
      role: "owner",
      origin: "internal",
      status: "verified",
      description: "We build things.",
      country: "PL",
      size: "s11_50",
      timezone: "Europe/Warsaw",
      websiteUrl: "https://acme.example",
    },
  ]);
});

describe("the company card in Spoki (stage 4b, D511)", () => {
  it("reads for signed-in people; the change is a card", () => {
    expect(toolsFor(null).map((t) => t.name)).not.toContain("get_my_company");
    expect(findTool("get_my_company")!.confirm(ctx)).toBe(false);
    expect(findTool("propose_company_update")!.confirm(ctx)).toBe(true);
    expect(ACCOUNT_CARD_TOOLS).toContain("propose_company_update");
  });

  it("lists own companies with role and links", async () => {
    const outcome = await runTool(ctx, "get_my_company", {});
    expect(outcome.llm).toContain('"role":"owner"');
    expect(outcome.llm).toContain('"publicPage":"/companies/acme"');
  });

  it("checks only the named fields with the cabinet's schema", () => {
    expect(namedCompanyPatch({ name: "Acme Labs", country: "de" })).toEqual({
      name: "Acme Labs",
      country: "DE",
    });
    expect(() => namedCompanyPatch({})).toThrow(HttpError);
    expect(() => namedCompanyPatch({ name: "A" })).toThrow(/name/);
    expect(() => namedCompanyPatch({ timezone: "Mars/Base" })).toThrow(
      /timezone/,
    );
  });

  it("shows no card to a recruiter and changes only after the card", async () => {
    companies.assertCanEditCompany.mockRejectedValueOnce(forbidden());
    await expect(
      toolPreview(ctx, "propose_company_update", {
        companyId: COMPANY,
        name: "Acme Labs",
      }),
    ).rejects.toMatchObject({ status: 403 });

    const args = { companyId: COMPANY, name: "Acme Labs" };
    await expect(
      toolPreview(ctx, "propose_company_update", args),
    ).resolves.toBe("Acme");
    await expect(
      runTool(ctx, "propose_company_update", args),
    ).rejects.toMatchObject({ status: 422 });
    expect(companies.editCompany).not.toHaveBeenCalled();
    await runTool(ctx, "propose_company_update", args, confirmed(args));
    expect(companies.editCompany).toHaveBeenCalledWith(
      COMPANY,
      { id: "u1" },
      { name: "Acme Labs" },
    );
  });

  it("links to the company page for website, domain and logo", () => {
    expect(offerPath("company", true)).toBe("/employer/company");
    expect(offerPath("company", false)).toBeNull();
  });
});
