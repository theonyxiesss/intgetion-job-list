import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cacheSpy,
  searchJobs,
  getJobForPublic,
  getVisibleCompany,
  readLiveStates,
  readLiveCompanyStatus,
} = vi.hoisted(() => ({
  cacheSpy: vi.fn(),
  searchJobs: vi.fn(),
  getJobForPublic: vi.fn(),
  getVisibleCompany: vi.fn(),
  readLiveStates: vi.fn(),
  readLiveCompanyStatus: vi.fn(),
}));

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
  getVisibleCompany,
  listPublishedJobsForCompany: vi.fn(),
}));

vi.mock("../live-state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../live-state")>();
  return {
    ...actual,
    readLiveStates,
    readLiveCompanyStatus,
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
  cachedVisibleCompany,
  stableJson,
} from "../cached-reads";

beforeEach(() => {
  vi.clearAllMocks();
});

const J1 = "11111111-1111-4111-8111-111111111111";

describe("stableJson", () => {
  it("ignores object key order", () => {
    expect(stableJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableJson({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});

describe("cachedJobForPublic", () => {
  it("returns null when the live status says the job is closed", async () => {
    getJobForPublic.mockResolvedValue({ id: J1, title: "Role" });
    readLiveStates.mockResolvedValue(
      new Map([
        [J1, { status: "closed", expiresAt: null, companyStatus: "verified" }],
      ]),
    );
    expect(await cachedJobForPublic(J1, "en")).toBeNull();
    expect(getJobForPublic).not.toHaveBeenCalled();
  });

  it("reads uncached when the cached content is null but the job is live", async () => {
    getJobForPublic
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: J1, title: "Role" });
    readLiveStates.mockResolvedValue(
      new Map([
        [
          J1,
          { status: "published", expiresAt: null, companyStatus: "verified" },
        ],
      ]),
    );
    expect(await cachedJobForPublic(J1, "en")).toEqual({
      id: J1,
      title: "Role",
    });
    expect(getJobForPublic).toHaveBeenCalledTimes(2);
  });

  it("returns null for a malformed id without any query", async () => {
    expect(await cachedJobForPublic("foo", "en")).toBeNull();
    expect(readLiveStates).not.toHaveBeenCalled();
    expect(getJobForPublic).not.toHaveBeenCalled();
  });

  it("returns the job when it is live", async () => {
    getJobForPublic.mockResolvedValue({ id: J1, title: "Role" });
    readLiveStates.mockResolvedValue(
      new Map([
        [
          J1,
          { status: "published", expiresAt: null, companyStatus: "verified" },
        ],
      ]),
    );
    expect(await cachedJobForPublic(J1, "en")).toEqual({
      id: J1,
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
        [
          "a",
          { status: "published", expiresAt: null, companyStatus: "verified" },
        ],
        [
          "b",
          { status: "expired", expiresAt: null, companyStatus: "verified" },
        ],
      ]),
    );
    const result = await cachedPublicSearch({} as never, "en");
    expect(result.items.map((item) => item.id)).toEqual(["a"]);
    expect(cacheSpy).toHaveBeenCalled();
  });
});

describe("cachedVisibleCompany", () => {
  it.each([null, "suspended", "rejected"])(
    "returns null when the live company status is %s",
    async (status) => {
      readLiveCompanyStatus.mockResolvedValue(status);
      getVisibleCompany.mockResolvedValue({ id: "c1" });
      expect(await cachedVisibleCompany("acme")).toBeNull();
    },
  );

  it("returns the company when its live status is verified", async () => {
    readLiveCompanyStatus.mockResolvedValue("verified");
    getVisibleCompany.mockResolvedValue({ id: "c1" });
    expect(await cachedVisibleCompany("acme")).toEqual({ id: "c1" });
  });
});
