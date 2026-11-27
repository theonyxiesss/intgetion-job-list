import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchJobs, listPromotedJobs, readLiveStates } = vi.hoisted(() => ({
  searchJobs: vi.fn(),
  listPromotedJobs: vi.fn(),
  readLiveStates: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => {
    return (...args: unknown[]) => fn(...args);
  },
}));

vi.mock("@/modules/jobs/service", () => ({ searchJobs, listPromotedJobs }));

vi.mock("../live-state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../live-state")>();
  return {
    ...actual,
    readLiveStates,
    filterLive: async <T extends { id: string }>(items: T[]) => {
      const states = await readLiveStates(items.map((item) => item.id));
      return items.filter((item) =>
        actual.isLive(states.get(item.id), new Date()),
      );
    },
  };
});

import { getGuestPicks } from "../guest-picks";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getGuestPicks", () => {
  it("drops a job closed after the snapshot was built", async () => {
    listPromotedJobs.mockResolvedValue([{ id: "p1" }]);
    searchJobs.mockResolvedValue({ items: [{ id: "a" }, { id: "b" }] });
    readLiveStates.mockResolvedValue(
      new Map([
        ["p1", { status: "published", expiresAt: null }],
        ["a", { status: "closed", expiresAt: null }],
        ["b", { status: "published", expiresAt: null }],
      ]),
    );
    const picks = await getGuestPicks("en");
    expect(picks.items.map((j) => j.id)).toEqual(["b"]);
    expect(picks.promoted.map((j) => j.id)).toEqual(["p1"]);
    expect(searchJobs).toHaveBeenCalledWith(
      { limit: 50, minOverlap: 3, sort: "newest" },
      "en",
      { hidden: null },
    );
  });

  it("returns empty lists when nothing is found", async () => {
    listPromotedJobs.mockResolvedValue([]);
    searchJobs.mockResolvedValue({ items: [] });
    readLiveStates.mockResolvedValue(new Map());
    await expect(getGuestPicks("en")).resolves.toEqual({
      promoted: [],
      items: [],
    });
  });
});
