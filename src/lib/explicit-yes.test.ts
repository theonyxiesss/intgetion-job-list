import { describe, expect, it } from "vitest";
import { isExplicitBriefConfirmation } from "@/modules/ugc/service/drafts";
import { isExplicitServiceDraftConfirmation } from "@/modules/freelance/service/drafts";
import { isExplicitJobDraftConfirmation } from "@/modules/bot/service/job-tools";
import { isExplicitYes } from "./explicit-yes";

const checks = [
  isExplicitBriefConfirmation,
  isExplicitServiceDraftConfirmation,
  isExplicitJobDraftConfirmation,
];

describe("a clear yes to sending a draft (D520)", () => {
  it("accepts a plain yes and the send verbs", () => {
    for (const check of checks) {
      for (const text of ["да", "Да!", "да, давай", "ок", "yes", "Да, конечно"])
        expect(check(text), text).toBe(true);
    }
    expect(isExplicitBriefConfirmation("Да, запускай бриф на 6 роликов")).toBe(
      true,
    );
    expect(isExplicitBriefConfirmation("Запускай")).toBe(true);
    expect(isExplicitServiceDraftConfirmation("Да, отправляй")).toBe(true);
    expect(isExplicitJobDraftConfirmation("Отправляй")).toBe(true);
  });

  it("refuses a yes that asks for a change, and any no (the D515 class)", () => {
    for (const check of checks) {
      for (const text of [
        "да, но не запускай пока",
        "ок, добавь ещё пример",
        "давай поменяем бюджет",
        "да, исправь цену",
        "Нет, не запускай",
        "Нет, не публикуй",
        "yes, but not now",
        "ok, change the price",
        "Хорошо, но позже",
        "",
      ])
        expect(check(text), text).toBe(false);
    }
  });

  it("refuses a long message that only starts with yes", () => {
    expect(isExplicitYes(`да ${"очень ".repeat(30)}`)).toBe(false);
  });
});
