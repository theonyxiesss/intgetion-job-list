import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import itMessages from "@/messages/it.json";
import ptBR from "@/messages/pt-BR.json";
import ru from "@/messages/ru.json";
import { NAV_ICONS } from "./nav-icons";
import { railActive, railHidden, railServices } from "./rail-items";

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

const everyLink = railServices;

describe("left rail (D477)", () => {
  it("lists the services in the order of the phone menu", () => {
    expect(railServices.map((link) => link.href)).toEqual([
      "/jobs",
      "/events",
      "/freelance",
      "/freelance/tasks",
      "/campaigns",
      "/services",
      "/chat",
    ]);
  });

  it("has no account group: those pages are in the account menu (D489)", () => {
    const hrefs = railServices.map((link) => link.href);
    for (const href of ["/profile", "/applications", "/saved-jobs"])
      expect(hrefs).not.toContain(href);
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
    expect(railActive("/freelance/tasks", "/freelance")).toBe(false);
    expect(railActive("/freelance/tasks", "/freelance/tasks")).toBe(true);
    expect(railActive("/freelance/tasksx", "/freelance")).toBe(true);
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
    ];
    for (const [locale, catalog] of Object.entries(catalogs))
      for (const key of keys)
        expect(typeof text(catalog, key), `${locale} ${key}`).toBe("string");
  });
});
