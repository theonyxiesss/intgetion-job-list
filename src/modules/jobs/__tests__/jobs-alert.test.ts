import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { formatMoneyDto, toMoneyDto } from "@/lib/money";
import type { TelegramSender } from "@/lib/telegram-bot";
import ru from "@/messages/ru.json";
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
    ...patch,
  };
}

describe("jobs alert text", () => {
  it("puts the salary range, the period label, and the Russian link last", () => {
    const text = jobsAlertText(
      row({
        salaryMin: BigInt(15_000_000),
        salaryMax: BigInt(25_000_000),
        salaryCurrency: "RUB",
        salaryPeriod: "month",
        salaryBasis: "gross",
      }),
    );
    const min = formatMoneyDto(
      toMoneyDto(BigInt(15_000_000), "RUB", "month", "gross"),
      "ru-RU",
    );
    const max = formatMoneyDto(
      toMoneyDto(BigInt(25_000_000), "RUB", "month", "gross"),
      "ru-RU",
    );
    expect(text).toBe(
      [
        "Вакансия: Backend-разработчик",
        "Компания: Northwind",
        `Зарплата: ${min} – ${max} / ${ru.jobs.month}`,
        "",
        `https://intgetion.com/ru/jobs/${id}`,
      ].join("\n"),
    );
    expect(text).not.toContain("описание");
  });

  it("keeps a salary line when the amount is missing", () => {
    const text = jobsAlertText(row());
    expect(text).toContain("Зарплата: не указана");
    expect(text.endsWith(`https://intgetion.com/ru/jobs/${id}`)).toBe(true);
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
    expect(euros).toContain(
      formatMoneyDto(
        toMoneyDto(BigInt(400_000), "EUR", "month", "gross"),
        "ru-RU",
      ),
    );
    expect(dollars).toContain(
      formatMoneyDto(
        toMoneyDto(BigInt(400_000), "USD", "month", "gross"),
        "ru-RU",
      ),
    );
    expect(dollars).not.toContain("не указана");
  });

  it("turns a line break in the title into a space", () => {
    const text = jobsAlertText(
      row({ title: "Редактор\nленты", companyName: "North\r\nwind" }),
    );
    expect(text.split("\n")[0]).toBe("Вакансия: Редактор ленты");
    expect(text.split("\n")[1]).toBe("Компания: North wind");
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
