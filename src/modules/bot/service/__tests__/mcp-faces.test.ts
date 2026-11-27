import { beforeEach, describe, expect, it, vi } from "vitest";

const { cachedPublicSearch, cachedJobForPublic } = vi.hoisted(() => ({
  cachedPublicSearch: vi.fn(),
  cachedJobForPublic: vi.fn(),
}));

vi.mock("@/modules/public-cache", () => ({
  cachedPublicSearch,
  cachedJobForPublic,
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

  it("browses with the cached syndicated search when there is no text or filter", async () => {
    cachedPublicSearch.mockResolvedValue({
      items: [internalJob("a"), internalJob("b")],
    });
    const result = await searchJobsFace.run({ q: "  " });
    expect(cachedPublicSearch).toHaveBeenCalledWith(expect.anything(), "en", {
      syndicatedOnly: true,
    });
    expect((result.data.jobs as unknown[]).length).toBe(2);
  });

  it("keeps the syndication guard on returned jobs", async () => {
    cachedPublicSearch.mockResolvedValue({
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
    expect(ids).toEqual(["a"]);
  });

  it("searches when any filter is set", async () => {
    cachedPublicSearch.mockResolvedValue({ items: [] });
    await searchJobsFace.run({ country: "DE" });
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
