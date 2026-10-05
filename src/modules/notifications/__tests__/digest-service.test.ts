import { describe, expect, it } from "vitest";
import {
  DIGEST_MAX_JOBS,
  isDigestDue,
  pickDigestJobs,
  type DigestCandidateJob,
} from "../service/digest";

const at = (iso: string) => new Date(iso);

describe("isDigestDue (D185)", () => {
  it("is due in the 08:00 local hour only", () => {
    // Moscow is UTC+3 all year.
    expect(isDigestDue("Europe/Moscow", null, at("2026-10-05T05:00:00Z"))).toBe(
      true,
    );
    expect(isDigestDue("Europe/Moscow", null, at("2026-10-05T05:59:00Z"))).toBe(
      true,
    );
    expect(isDigestDue("Europe/Moscow", null, at("2026-10-05T06:00:00Z"))).toBe(
      false,
    );
    expect(isDigestDue("Europe/Moscow", null, at("2026-10-05T04:00:00Z"))).toBe(
      false,
    );
  });

  it("finds the morning for quarter-hour offsets on the hourly tick", () => {
    // Kathmandu +5:45: the 02:00Z tick is 07:45, the 03:00Z tick is 08:45.
    expect(
      isDigestDue("Asia/Kathmandu", null, at("2026-10-05T02:00:00Z")),
    ).toBe(false);
    expect(
      isDigestDue("Asia/Kathmandu", null, at("2026-10-05T03:00:00Z")),
    ).toBe(true);
  });

  it("follows daylight saving time", () => {
    // New York: EDT (-4) in July, EST (-5) in January.
    expect(
      isDigestDue("America/New_York", null, at("2026-07-06T12:00:00Z")),
    ).toBe(true);
    expect(
      isDigestDue("America/New_York", null, at("2026-01-12T13:00:00Z")),
    ).toBe(true);
    expect(
      isDigestDue("America/New_York", null, at("2026-01-12T12:00:00Z")),
    ).toBe(false);
  });

  it("waits a full day after the previous digest", () => {
    const sent = at("2026-10-05T05:00:00Z");
    expect(isDigestDue("Europe/Moscow", sent, at("2026-10-05T05:30:00Z"))).toBe(
      false,
    );
    expect(isDigestDue("Europe/Moscow", sent, at("2026-10-06T05:00:00Z"))).toBe(
      true,
    );
  });

  it("does not shorten the interval when the previous digest was late", () => {
    // Sent at 08:59 local; the next 08:00 is only 23 hours later.
    const sent = at("2026-10-05T05:59:00Z");
    expect(isDigestDue("Europe/Moscow", sent, at("2026-10-06T05:00:00Z"))).toBe(
      false,
    );
    expect(isDigestDue("Europe/Moscow", sent, at("2026-10-07T05:00:00Z"))).toBe(
      true,
    );
  });
});

describe("pickDigestJobs (D186, D187)", () => {
  const now = at("2026-10-05T05:00:00Z");
  const job = (
    id: number,
    score: number,
    publishedAt: string | null,
  ): DigestCandidateJob => ({
    jobId: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    title: `Job ${id}`,
    companyName: "Co",
    score,
    publishedAt,
  });

  it("keeps strong matches only, best first, at most five", () => {
    const jobs = [
      job(1, 0.64, "2026-10-04T10:00:00Z"),
      ...[0.7, 0.9, 0.8, 0.66, 0.75, 0.95].map((score, index) =>
        job(index + 2, score, "2026-10-04T10:00:00Z"),
      ),
    ];
    const picked = pickDigestJobs(jobs, null, now);
    expect(picked).toHaveLength(DIGEST_MAX_JOBS);
    expect(picked.map((item) => item.score)).toEqual([
      0.95, 0.9, 0.8, 0.75, 0.7,
    ]);
  });

  it("takes only jobs published after the previous digest", () => {
    const picked = pickDigestJobs(
      [
        job(1, 0.9, "2026-10-04T04:00:00Z"),
        job(2, 0.9, "2026-10-04T06:00:00Z"),
        job(3, 0.9, null),
      ],
      at("2026-10-04T05:00:00Z"),
      now,
    );
    expect(picked.map((item) => item.title)).toEqual(["Job 2"]);
  });

  it("looks back one week for the first digest", () => {
    const picked = pickDigestJobs(
      [
        job(1, 0.9, "2026-09-27T04:00:00Z"),
        job(2, 0.9, "2026-09-29T04:00:00Z"),
      ],
      null,
      now,
    );
    expect(picked.map((item) => item.title)).toEqual(["Job 2"]);
  });
});
