import { beforeEach, describe, expect, it, vi } from "vitest";

const { cachedPublicSearch, cachedJobForPublic, getGuestPicks } = vi.hoisted(
  () => ({
    cachedPublicSearch: vi.fn(),
    cachedJobForPublic: vi.fn(),
    getGuestPicks: vi.fn(),
  }),
);

vi.mock("@/modules/public-cache", () => ({
  cachedPublicSearch,
  cachedJobForPublic,
  getGuestPicks,
}));
vi.mock("@/modules/jobs/service", () => ({
  getVisibleCompany: vi.fn(),
}));
vi.mock("@/modules/events/service", () => ({ findEventsForPerson: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://x.test" }));

import { getJobFace, searchJobsFace } from "../mcp-faces";

const internalJob = (id: string) => ({
  id,
  title: `Job ${id}`,
  company: { name: "Acme", slug: "acme" },
  category: "engineering",
  workFormat: "remote",
  employmentType: "full_time",
  location: null,
  salaryMin: null,
  salaryMax: null,
  publishedAt: "2026-01-01T00:00:00.000Z",
  source: { type: "internal", name: null, url: null },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchJobsFace", () => {
  it("returns an empty list and a message when nothing matches", async () => {
    cachedPublicSearch.mockResolvedValue({ items: [] });
    const result = await searchJobsFace.run({ q: "no-such-thing" });
    expect(result.data.jobs).toEqual([]);
    expect(result.data.message).toBe(
      "No matching active jobs on INTGETION right now.",
    );
    expect(cachedPublicSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "no-such-thing" }),
      "en",
      { syndicatedOnly: true },
    );
  });

  it("does not add a message when jobs are found", async () => {
    cachedPublicSearch.mockResolvedValue({ items: [internalJob("a")] });
    const result = await searchJobsFace.run({ q: "dev" });
    expect((result.data.jobs as unknown[]).length).toBe(1);
    expect(result.data).not.toHaveProperty("message");
  });

  it("uses the guest picks when there is no text and no filters", async () => {
    getGuestPicks.mockResolvedValue({
      promoted: [],
      items: [internalJob("a"), internalJob("b")],
    });
    const result = await searchJobsFace.run({ q: "  " });
    expect(getGuestPicks).toHaveBeenCalledWith("en");
    expect(cachedPublicSearch).not.toHaveBeenCalled();
    expect((result.data.jobs as unknown[]).length).toBe(2);
  });

  it("keeps the syndication guard on guest picks", async () => {
    getGuestPicks.mockResolvedValue({
      promoted: [],
      items: [
        internalJob("a"),
        {
          ...internalJob("b"),
          source: { type: "imported", name: "no-such-source", url: "u" },
        },
      ],
    });
    const result = await searchJobsFace.run({});
    const ids = (result.data.jobs as { id: string }[]).map((job) => job.id);
    expect(ids).not.toContain("b");
  });

  it("returns the message when the guest picks are empty", async () => {
    getGuestPicks.mockResolvedValue({ promoted: [], items: [] });
    const result = await searchJobsFace.run({});
    expect(result.data.jobs).toEqual([]);
    expect(result.data.message).toBe(
      "No matching active jobs on INTGETION right now.",
    );
  });

  it("searches when any filter is set", async () => {
    cachedPublicSearch.mockResolvedValue({ items: [] });
    await searchJobsFace.run({ country: "DE" });
    expect(getGuestPicks).not.toHaveBeenCalled();
    expect(cachedPublicSearch).toHaveBeenCalled();
  });
});

describe("getJobFace", () => {
  it("answers not found for a job that is not live", async () => {
    cachedJobForPublic.mockResolvedValue(null);
    const result = await getJobFace.run({ id: "closed" });
    expect(cachedJobForPublic).toHaveBeenCalledWith("closed", "en");
    expect(result.data).toEqual({ available: false, reason: "not_found" });
  });
});
