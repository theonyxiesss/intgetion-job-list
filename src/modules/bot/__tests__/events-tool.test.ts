import { beforeEach, describe, expect, it, vi } from "vitest";

const events = vi.hoisted(() => ({
  getEventBySlug: vi.fn(),
  findEventsForPerson: vi.fn(),
}));

vi.mock("@/modules/events/service", async (original) => ({
  ...(await original<object>()),
  ...events,
}));

const { systemPrompt } = await import("../prompts/system");
const { findTool, runTool, toolsFor } = await import("../service/tools");

const event = {
  id: "e1",
  slug: "ethwarsaw-2026",
  title: "ETHWarsaw 2026",
  description: "A Web3 conference in Warsaw.",
  startsAt: new Date("2026-11-03T08:00:00.000Z"),
  endsAt: new Date("2026-11-04T17:00:00.000Z"),
  allDay: false,
  timeZone: "Europe/Warsaw",
  format: "offline",
  country: "PL",
  city: "Warsaw",
  url: "https://example.org",
  cfpUrl: null,
  cfpEndsAt: new Date("2026-10-25T00:00:00.000Z"),
  topics: ["web3"],
  kind: "conference",
  status: "published",
  updatedAt: new Date(),
  source: { name: "confs.tech", url: null },
};

const guest = { userId: null, conversationId: "c1", locale: "en", state: {} };

beforeEach(() => {
  vi.clearAllMocks();
  events.getEventBySlug.mockResolvedValue(event);
  events.findEventsForPerson.mockResolvedValue([event]);
});

describe("events in Spoki (stage 5, D501)", () => {
  it("lets anyone read one event and never offers it as a write", () => {
    expect(toolsFor(null).map((tool) => tool.name)).toContain("get_event");
    expect(findTool("get_event")!.confirm(guest)).toBe(false);
  });

  it("gives find_events results a slug to open one", async () => {
    const outcome = await runTool(guest, "find_events", {});
    expect(outcome.llm).toContain('"slug":"ethwarsaw-2026"');
  });

  it("shows the start in the person's own time zone when known", async () => {
    const outcome = await runTool(
      { ...guest, state: { draft: { timezone: "Asia/Tbilisi" } } },
      "get_event",
      { slug: "ethwarsaw-2026" },
    );
    expect(outcome.llm).toContain('"startsInYourTime":"2026-11-03 12:00"');
    expect(outcome.llm).toContain('"callForPapersUntil":"2026-10-25"');
    expect(outcome.llm).not.toContain("example.org");

    const noZone = await runTool(guest, "get_event", {
      slug: "ethwarsaw-2026",
    });
    expect(noZone.llm).toContain('"startsInYourTime":null');
  });

  it("says a passed or removed event is not on the site", async () => {
    events.getEventBySlug.mockResolvedValueOnce({
      ...event,
      status: "expired",
    });
    const passed = await runTool(guest, "get_event", {
      slug: "ethwarsaw-2026",
    });
    expect(passed.llm).toContain("not on the site");
    events.getEventBySlug.mockResolvedValueOnce(null);
    const missing = await runTool(guest, "get_event", { slug: "nope" });
    expect(missing.llm).toContain("not on the site");
    await expect(
      runTool(guest, "get_event", { slug: "Bad Slug!" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("tells Spoki to open one event and remind the day before", () => {
    const prompt = systemPrompt({ locale: "en", signedIn: true });
    expect(prompt).toContain("For one event in full call get_event");
    expect(prompt).toContain("create_reminder the day before");
  });
});
