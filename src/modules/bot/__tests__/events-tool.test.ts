import { beforeEach, describe, expect, it, vi } from "vitest";

const findEventsForPerson = vi.fn();
vi.mock("@/modules/events/service", () => ({
  findEventsForPerson: (...args: unknown[]) => findEventsForPerson(...args),
}));

const { runTool, toolNeedsConfirmation } = await import("../service");
const { offerPath } = await import("../service/offers");

const guest = {
  userId: null,
  conversationId: "c",
  locale: "en",
  state: {},
};

const event = {
  id: "e1",
  slug: "fictional-web3-builders-summit-2026-a1b2c3",
  title: "Fictional Web3 Builders Summit",
  description: "",
  startsAt: new Date("2026-11-12T00:00:00.000Z"),
  endsAt: new Date("2026-11-13T23:59:59.000Z"),
  allDay: true,
  timeZone: null,
  format: "offline",
  country: "PT",
  city: "Lisbon",
  url: "https://example.com/web3-builders-summit",
  cfpUrl: null,
  cfpEndsAt: null,
  topics: ["web3", "dev"],
  kind: "summit",
  status: "published",
  updatedAt: new Date("2026-10-15T00:00:00.000Z"),
  source: { name: "confs.tech", url: "https://confs.tech" },
};

describe("find_events (D413)", () => {
  beforeEach(() => findEventsForPerson.mockReset());

  it("is read-only and open to guests, with events as untrusted data", async () => {
    findEventsForPerson.mockResolvedValue([event]);
    expect(toolNeedsConfirmation(guest, "find_events")).toBe(false);
    const outcome = await runTool(guest, "find_events", { topics: ["web3"] });
    expect(outcome.client).toBeUndefined();
    expect(outcome.llm).toContain(
      '<untrusted_data source="event:fictional-web3-builders-summit-2026-a1b2c3"',
    );
    expect(outcome.llm).toContain('"starts":"2026-11-12"');
    expect(outcome.llm).toContain('"city":"Lisbon"');
    // The organizer link is not handed to the model: the card is the link.
    expect(outcome.llm).not.toContain("https://");
  });

  it("falls back to the known country and remote preference", async () => {
    findEventsForPerson.mockResolvedValue([]);
    const outcome = await runTool(
      {
        ...guest,
        state: { draft: { country: "DE", workFormats: ["remote"] } },
      },
      "find_events",
      {},
    );
    expect(outcome.llm).toBe("No upcoming events found.");
    expect(findEventsForPerson).toHaveBeenCalledWith(
      expect.objectContaining({ country: "DE", remote: true, limit: 5 }),
    );
  });

  it("an explicit request wins over the profile", async () => {
    findEventsForPerson.mockResolvedValue([]);
    await runTool(
      {
        ...guest,
        state: { draft: { country: "DE", workFormats: ["onsite"] } },
      },
      "find_events",
      { country: "PT", remote: false, kind: "meetup", limit: 2 },
    );
    expect(findEventsForPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "PT",
        remote: false,
        kind: "meetup",
        limit: 2,
      }),
    );
  });

  it("refuses unknown topics, lower-case countries and extra fields", async () => {
    for (const input of [
      { topics: ["gaming"] },
      { country: "de" },
      { url: "https://evil.test" },
      { limit: 50 },
    ]) {
      await expect(runTool(guest, "find_events", input)).rejects.toMatchObject({
        status: 400,
      });
    }
    expect(findEventsForPerson).not.toHaveBeenCalled();
  });

  it("the events card opens the public catalog for anyone", async () => {
    expect(offerPath("events", false)).toBe("/events");
    expect(offerPath("events", true)).toBe("/events");
    const card = await runTool(guest, "offer_step", { action: "events" });
    expect(card.client).toEqual({ kind: "offer", data: { action: "events" } });
  });
});
