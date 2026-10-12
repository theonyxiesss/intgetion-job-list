import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import itMessages from "@/messages/it.json";
import ptBR from "@/messages/pt-BR.json";
import ru from "@/messages/ru.json";
import { footerGroups } from "./footer-groups";

const catalogs = { en, ru, es, "pt-BR": ptBR, de, fr, it: itMessages };

function text(catalog: object, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalog,
    );
}

function group(title: string) {
  const found = footerGroups.find((g) => g.title === title);
  if (!found) throw new Error(`no group ${title}`);
  return found;
}

describe("footer groups (D396)", () => {
  it("keeps five groups in order", () => {
    expect(footerGroups.map((g) => g.title)).toEqual([
      "footer.platform",
      "footer.resources",
      "footer.companyGroup",
      "footer.sites",
      "footer.legal",
    ]);
  });

  it("shows the founder's Company words in order, in English as given", () => {
    const company = group("footer.companyGroup");
    expect(text(en, company.title)).toBe("Company");
    expect(company.items.map((item) => text(en, item.label))).toEqual([
      "About Us",
      "Feedback",
      "Email Support",
      "Ambassador Program",
      "Media & Press Kit",
      "API Access",
      "Verify Official Accounts",
      "Terms & Privacy Policy",
    ]);
  });

  it("links only About Us and Terms & Privacy Policy, to pages that exist", () => {
    const company = group("footer.companyGroup");
    expect(
      company.items.filter((item) => item.href).map((item) => item.href),
    ).toEqual(["/company", "/terms"]);
    expect(company.items.filter((item) => !item.href)).toHaveLength(6);
    expect(company.items[0]).toEqual({
      href: "/company",
      label: "footer.aboutUs",
    });
    expect(company.items[7]).toEqual({
      href: "/terms",
      label: "footer.termsPrivacy",
    });
  });

  it("keeps Legal, Portfolio, Platform and Resources (D241, D388)", () => {
    expect(group("footer.legal").items).toEqual([
      { href: "/terms", label: "legal.terms" },
      { href: "/privacy", label: "legal.privacy" },
      { href: "/privacy#cookie-settings", label: "legal.cookies" },
    ]);
    expect(group("footer.sites").items).toEqual([
      { href: "/portfolio", label: "footer.portfolio" },
    ]);
    expect(group("footer.platform").items.length).toBeGreaterThan(0);
    expect(group("footer.resources").items.length).toBeGreaterThan(0);
  });

  it("does not reuse footer.company, which is the company profile", () => {
    const keys = footerGroups.flatMap((g) => [
      g.title,
      ...g.items.map((item) => item.label),
    ]);
    expect(keys).not.toContain("footer.company");
    expect(text(en, "footer.company")).toBe("Company profile");
  });

  for (const [locale, catalog] of Object.entries(catalogs)) {
    it(`${locale}: has a non-empty string for every footer key`, () => {
      const missing = footerGroups
        .flatMap((g) => [g.title, ...g.items.map((item) => item.label)])
        .filter((key) => {
          const value = text(catalog, key);
          return typeof value !== "string" || value.trim() === "";
        });
      expect(missing).toEqual([]);
    });
  }
});
