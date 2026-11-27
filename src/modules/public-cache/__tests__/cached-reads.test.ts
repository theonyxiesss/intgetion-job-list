import { beforeEach, describe, expect, it, vi } from "vitest";

const { cacheSpy, searchJobs, getJobForPublic, readLiveStates } = vi.hoisted(
  () => ({
    cacheSpy: vi.fn(),
    searchJobs: vi.fn(),
    getJobForPublic: vi.fn(),
    readLiveStates: vi.fn(),
  }),
);

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => {
    return (...args: unknown[]) => {
      cacheSpy(...args);
      return fn(...args);
    };
  },
}));

vi.mock("@/modules/jobs/service", () => ({
  searchJobs,
  getJobForPublic,
  getVisibleCompany: vi.fn(),
  listPublishedJobsForCompany: vi.fn(),
}));

vi.mock("../live-state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../live-state")>();
  return {
    ...actual,
    readLiveStates,
    // filterLive calls readLiveStates internally, so rebuild it on the mock.
    filterLive: async <T extends { id: string }>(items: T[]) => {
      const states = await readLiveStates(items.map((item) => item.id));
      return items.filter((item) =>
        actual.isLive(states.get(item.id), new Date()),
      );
    },
  };
});

import {
  cachedJobForPublic,
  cachedPublicSearch,
  stableJson,
} from "../cached-reads";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("stableJson", () => {
  it("ignores object key order", () => {
    expect(stableJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableJson({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});

describe("cachedJobForPublic", () => {
  it("returns null when the live status says the job is closed", async () => {
    getJobForPublic.mockResolvedValue({ id: "j1", title: "Role" });
    readLiveStates.mockResolvedValue(
      new Map([["j1", { status: "closed", expiresAt: null }]]),
    );
    expect(await cachedJobForPublic("j1", "en")).toBeNull();
  });

  it("returns the job when it is live", async () => {
    getJobForPublic.mockResolvedValue({ id: "j1", title: "Role" });
    readLiveStates.mockResolvedValue(
      new Map([["j1", { status: "published", expiresAt: null }]]),
    );
    expect(await cachedJobForPublic("j1", "en")).toEqual({
      id: "j1",
      title: "Role",
    });
  });
});

describe("cachedPublicSearch", () => {
  it("bypasses the cache for cursor queries", async () => {
    searchJobs.mockResolvedValue({ items: [], nextCursor: null });
    await cachedPublicSearch({ cursor: "abc" } as never, "en");
    expect(searchJobs).toHaveBeenCalledWith({ cursor: "abc" }, "en", {
      hidden: null,
      syndicatedOnly: undefined,
    });
    expect(cacheSpy).not.toHaveBeenCalled();
  });

  it("drops items whose live status is expired", async () => {
    searchJobs.mockResolvedValue({
      items: [{ id: "a" }, { id: "b" }],
      nextCursor: null,
    });
    readLiveStates.mockResolvedValue(
      new Map([
        ["a", { status: "published", expiresAt: null }],
        ["b", { status: "expired", expiresAt: null }],
      ]),
    );
    const result = await cachedPublicSearch({} as never, "en");
    expect(result.items.map((item) => item.id)).toEqual(["a"]);
    expect(cacheSpy).toHaveBeenCalled();
  });
});
