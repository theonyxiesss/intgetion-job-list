import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TelegramSender } from "@/lib/telegram-bot";
import {
  isIntgetionHost,
  isJobsAlertCandidate,
  jobsAlertText,
  parseJobsAlertChatId,
  runJobsAlert,
  type JobsAlertRow,
} from "../service/jobs-alert";

const id = "00000000-0000-4000-8000-000000000000";
const watermark = new Date("2026-10-07T12:00:00.000Z");
const posted = new Date("2026-10-11T15:00:00.000Z");
const HOUR = 60 * 60_000;

function row(patch: Partial<JobsAlertRow> = {}): JobsAlertRow {
  return {
    id,
    title: "Backend-разработчик",
    companyName: "Northwind",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    salaryBasis: null,
    workFormat: "remote",
    location: null,
    locationCountry: null,
    firstPublishedAt: null,
    ...patch,
  };
}

describe("jobs alert text", () => {
  it("posts a salaried remote job as a short English card", () => {
    const text = jobsAlertText(
      row({
        title: "Senior Mobile Developer (iOS + Android)",
        companyName: "HyroTrader",
        workFormat: "remote",
        location: "Lisbon",
        locationCountry: "PT",
        salaryMin: BigInt(600_000),
        salaryMax: BigInt(1_100_000),
        salaryCurrency: "USD",
        salaryPeriod: "month",
        salaryBasis: "gross",
        firstPublishedAt: posted,
      }),
      new Date(posted.getTime() + 60_000),
    );
    expect(text).toBe(
      [
        "💼 Senior Mobile Developer (iOS + Android)",
        "🏛️ at HyroTrader",
        "🌍 Remote",
        "💰 $6k-11k/month",
        "💥 New! Posted 1 minute ago",
        `✅ Apply → https://intgetion.com/jobs/${id}`,
        "",
        "Or forward to a friend!",
      ].join("\n"),
    );
    expect(text).toContain(`✅ Apply → https://intgetion.com/jobs/${id}`);
    expect(text).not.toContain("/ru/");
    expect(text).not.toContain("cjl.ist");
    expect(text.endsWith("Or forward to a friend!")).toBe(true);
    expect(text).not.toContain("описание");
    expect(text).not.toContain("description");
    expect(text).not.toContain("skills");
    expect(text).not.toContain("не указана");
  });

  it("omits the money line when both amounts are missing", () => {
    const text = jobsAlertText(row());
    expect(text).not.toContain("💰");
    expect(text).not.toContain("не указана");
    expect(text).toContain(`✅ Apply → https://intgetion.com/jobs/${id}`);
    expect(text.endsWith("\n\nOr forward to a friend!")).toBe(true);
  });

  it("uses the employer currency, and USD when the job has none", () => {
    const euros = jobsAlertText(
      row({
        salaryMin: BigInt(400_000),
        salaryCurrency: "eur",
        salaryPeriod: "month",
        salaryBasis: "gross",
      }),
    );
    const dollars = jobsAlertText(
      row({
        salaryMin: BigInt(400_000),
        salaryCurrency: null,
        salaryPeriod: "month",
        salaryBasis: "gross",
      }),
    );
    const onlyMax = jobsAlertText(
      row({
        salaryMax: BigInt(1_100_000),
        salaryCurrency: "USD",
        salaryPeriod: "month",
        salaryBasis: "gross",
      }),
    );
    expect(euros).toContain("💰 €4k/month");
    expect(dollars).toContain("💰 $4k/month");
    expect(onlyMax.split("\n").find((line) => line.startsWith("💰"))).toBe(
      "💰 $11k/month",
    );
    expect(dollars).not.toContain("не указана");
  });

  it("prints hour and year on the money line", () => {
    const hour = jobsAlertText(
      row({
        salaryMin: BigInt(5_000),
        salaryCurrency: "USD",
        salaryPeriod: "hour",
        salaryBasis: "gross",
      }),
    );
    const year = jobsAlertText(
      row({
        salaryMin: BigInt(8_000_000),
        salaryCurrency: "USD",
        salaryPeriod: "year",
        salaryBasis: "gross",
      }),
    );
    expect(hour).toContain("💰 $50/hour");
    expect(year).toContain("💰 $80k/year");
  });

  it("names remote, hybrid, and onsite", () => {
    const place = (patch: Partial<JobsAlertRow>) =>
      jobsAlertText(row(patch)).split("\n")[2];
    expect(place({ workFormat: "remote", location: "Berlin" })).toBe(
      "🌍 Remote",
    );
    expect(place({ workFormat: "hybrid", location: "Berlin" })).toBe(
      "🌍 Hybrid · Berlin",
    );
    expect(place({ workFormat: "hybrid", location: "Berlin\noffice" })).toBe(
      "🌍 Hybrid · Berlin office",
    );
    expect(place({ workFormat: "hybrid", location: null })).toBe("🌍 Hybrid");
    expect(place({ workFormat: "onsite", location: "Berlin" })).toBe(
      "🌍 Berlin",
    );
    expect(
      place({ workFormat: "onsite", location: null, locationCountry: "DE" }),
    ).toBe("🌍 DE");
    expect(
      place({
        workFormat: "onsite",
        location: " \n ",
        locationCountry: "DE",
      }),
    ).toBe("🌍 DE");
    expect(
      place({ workFormat: "onsite", location: null, locationCountry: null }),
    ).toBe("🌍 On-site");
  });

  it("says New! under a day and Posted after that", () => {
    const line = (at: Date) =>
      jobsAlertText(row({ firstPublishedAt: posted }), at)
        .split("\n")
        .find((item) => item.startsWith("💥"));
    expect(line(new Date(posted.getTime() + 30_000))).toBe(
      "💥 New! Posted just now",
    );
    expect(line(new Date(posted.getTime() + 60_000))).toBe(
      "💥 New! Posted 1 minute ago",
    );
    expect(line(new Date(posted.getTime() + 12 * 60_000))).toBe(
      "💥 New! Posted 12 minutes ago",
    );
    expect(line(new Date(posted.getTime() + HOUR))).toBe(
      "💥 New! Posted 1 hour ago",
    );
    expect(line(new Date(posted.getTime() + 3 * HOUR))).toBe(
      "💥 New! Posted 3 hours ago",
    );
    expect(line(new Date(posted.getTime() + 23 * HOUR))).toBe(
      "💥 New! Posted 23 hours ago",
    );
    expect(line(new Date(posted.getTime() + 24 * HOUR))).toBe(
      "💥 Posted 1 day ago",
    );
    expect(line(new Date(posted.getTime() + 4 * 24 * HOUR))).toBe(
      "💥 Posted 4 days ago",
    );
    expect(jobsAlertText(row({ firstPublishedAt: null }))).not.toContain("💥");
    expect(jobsAlertText(row({ firstPublishedAt: null }))).not.toContain(
      "New!",
    );
  });

  it("turns a line break in the title into a space", () => {
    const text = jobsAlertText(
      row({ title: "Редактор\nленты", companyName: "North\r\nwind" }),
    );
    expect(text.split("\n")[0]).toBe("💼 Редактор ленты");
    expect(text.split("\n")[1]).toBe("🏛️ at North wind");
  });

  it("reads place and the first publish time, and does not clear the stamp", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/jobs/service/jobs-alert.ts"),
      "utf8",
    );
    expect(source).toContain("j.work_format::text as work_format");
    expect(source).toMatch(/j\.location,/);
    expect(source).toContain("j.location_country");
    expect(source).toContain("as first_published_at");
    expect(source).not.toContain("jobs_alert_sent_at = null");
  });
});

describe("jobs alert eligibility", () => {
  const base = {
    status: "published",
    sentAt: null,
    firstPublishedAt: new Date("2026-10-07T12:05:00.000Z"),
    watermark,
    remotive: false,
    host: "intgetion.com",
  };

  it("skips drafts, closed, and removed jobs", () => {
    for (const status of ["draft", "closed", "removed"]) {
      expect(isJobsAlertCandidate({ ...base, status })).toBe(false);
    }
  });

  it("skips a job whose first publish is before the watermark", () => {
    expect(
      isJobsAlertCandidate({
        ...base,
        firstPublishedAt: new Date("2026-10-07T11:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("skips Remotive on intgetion.com and still allows another host", () => {
    expect(isJobsAlertCandidate({ ...base, remotive: true })).toBe(false);
    expect(
      isJobsAlertCandidate({
        ...base,
        remotive: true,
        host: "localhost:3000",
      }),
    ).toBe(true);
    expect(isIntgetionHost("www.intgetion.com")).toBe(true);
  });
});

describe("jobs alert send", () => {
  it("does not call the sender when the chat id is empty", async () => {
    const sender = vi.fn<TelegramSender>();
    const deliver = vi.fn();
    const result = await runJobsAlert({
      sender,
      host: "intgetion.com",
      chatIdRaw: "  ",
      deliver,
    });
    expect(result).toEqual({ disabled: true });
    expect(sender).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("stamps only a sent message and retries a failed one next time", async () => {
    const sent = new Set<string>();
    const calls: string[] = [];
    const sender = vi.fn<TelegramSender>(async () => {
      calls.push("send");
      return calls.length === 1 ? "failed" : "sent";
    });
    const job = row();
    const deliver = async (exclude: readonly string[]) => {
      if (sent.has(job.id) || exclude.includes(job.id))
        return { status: "empty" as const };
      const result = await sender(-100, jobsAlertText(job));
      if (result !== "sent") return { status: "failed" as const, id: job.id };
      sent.add(job.id);
      return { status: "sent" as const };
    };

    const first = await runJobsAlert({
      sender,
      host: "localhost",
      chatIdRaw: "-100",
      deliver,
    });
    expect(first).toEqual({ sent: 0, failed: 1 });
    expect(sent.size).toBe(0);

    const second = await runJobsAlert({
      sender,
      host: "localhost",
      chatIdRaw: "-100",
      deliver,
    });
    expect(second).toEqual({ sent: 1, failed: 0 });
    expect(sent.has(job.id)).toBe(true);

    const third = await runJobsAlert({
      sender,
      host: "localhost",
      chatIdRaw: "-100",
      deliver,
    });
    expect(third).toEqual({ sent: 0, failed: 0 });
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it("does not stamp a blocked send", async () => {
    const sender = vi.fn<TelegramSender>(async () => "blocked");
    let stamped = false;
    const result = await runJobsAlert({
      sender,
      host: "localhost",
      chatIdRaw: "-100",
      deliver: async (exclude) => {
        if (exclude.includes(id) || stamped) return { status: "empty" };
        const outcome = await sender(-100, "text");
        if (outcome === "sent") stamped = true;
        return { status: "failed", id };
      },
    });
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(stamped).toBe(false);
  });
});

describe("jobs alert stays off the publish path", () => {
  it("status changes do not mention the channel sender", () => {
    const root = resolve(process.cwd(), "src/modules/jobs");
    for (const file of [
      "service/notify-job.ts",
      "service/status-machine.ts",
      "repo/jobs-repo.ts",
      "repo/admin-jobs-repo.ts",
    ]) {
      const source = readFileSync(resolve(root, file), "utf8");
      expect(source).not.toContain("runJobsAlert");
      expect(source).not.toContain("jobs_alert_sent_at");
    }
  });
});

describe("jobs alert chat id", () => {
  it("accepts a negative channel id and rejects blank or text", () => {
    expect(parseJobsAlertChatId("-100123")).toBe(-100123);
    expect(parseJobsAlertChatId("")).toBeNull();
    expect(parseJobsAlertChatId("channel")).toBeNull();
    expect(parseJobsAlertChatId("1.5")).toBeNull();
  });
});
