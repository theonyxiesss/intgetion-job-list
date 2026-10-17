import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import itMessages from "@/messages/it.json";
import ptBR from "@/messages/pt-BR.json";
import ru from "@/messages/ru.json";
import { NAV_ICONS } from "./nav-icons";
import { railActive, railHidden, railMine, railServices } from "./rail-items";

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

const everyLink = [
  ...railServices,
  ...railMine("candidate"),
  ...railMine("employer"),
];

describe("left rail (D477)", () => {
  it("lists the services in the order of the phone menu", () => {
    expect(railServices.map((link) => link.href)).toEqual([
      "/jobs",
      "/events",
      "/freelance",
      "/campaigns",
      "/services",
      "/chat",
    ]);
  });

  it("shows the account group by who is looking", () => {
    expect(railMine("guest")).toEqual([]);
    expect(railMine("candidate").map((link) => link.href)).toEqual([
      "/profile",
      "/applications",
      "/saved-jobs",
    ]);
    expect(railMine("employer").map((link) => link.href)).toEqual([
      "/employer/jobs",
      "/employer/company",
      "/employer/billing",
    ]);
  });

  it("stays off the home hero and the chat only", () => {
    expect(railHidden("/")).toBe(true);
    expect(railHidden("/chat")).toBe(true);
    expect(railHidden("/chat/history")).toBe(true);
    expect(railHidden("/jobs")).toBe(false);
    expect(railHidden("/events")).toBe(false);
    expect(railHidden("/chatter")).toBe(false);
  });

  it("marks a section and the pages inside it", () => {
    expect(railActive("/jobs/123", "/jobs")).toBe(true);
    expect(railActive("/jobs", "/jobs")).toBe(true);
    expect(railActive("/jobsearch", "/jobs")).toBe(false);
  });

  it("has a mark for every link", () => {
    for (const link of everyLink) expect(NAV_ICONS[link.href]).toBeDefined();
  });

  it("has every label and group title in every locale", () => {
    const keys = [
      ...everyLink.map((link) => link.label),
      "nav.rail",
      "nav.railSections",
      "nav.railCategories",
      "nav.railMine",
    ];
    for (const [locale, catalog] of Object.entries(catalogs))
      for (const key of keys)
        expect(typeof text(catalog, key), `${locale} ${key}`).toBe("string");
  });
});
