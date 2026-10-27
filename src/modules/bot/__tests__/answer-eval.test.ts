import { describe, expect, it } from "vitest";
import { scoreGroundedAnswer } from "../service/answer-eval";
import { routeDomains } from "../service/routing";
import { toolsFor } from "../service/tools";
import { ANSWER_EVAL_CASES } from "./answer-eval-cases";

const service = {
  locale: "ru" as const,
  userText: "Найди услугу монтажа видео",
  toolResult: "Услуга: Монтаж коротких видео. Цена: $30. Срок: 2 дня.",
  requiredFacts: ["Монтаж коротких видео", "$30"],
  empty: false,
};

describe("Spoki grounded answer eval", () => {
  it("fixes a successful and empty case for each of five platform domains", () => {
    expect(ANSWER_EVAL_CASES).toHaveLength(10);
    expect(new Set(ANSWER_EVAL_CASES.map((item) => item.id)).size).toBe(10);
    for (const domain of ["jobs", "freelance", "ugc", "events", "account"]) {
      const cases = ANSWER_EVAL_CASES.filter((item) => item.domain === domain);
      expect(cases.map((item) => item.empty).sort()).toEqual([false, true]);
    }
  });

  it("offers the expected read tool for every synthetic request", () => {
    for (const item of ANSWER_EVAL_CASES) {
      const names = toolsFor(
        item.signedIn ? "00000000-0000-4000-8000-0000000000a1" : null,
        {},
        routeDomains({ text: item.userText }),
      ).map((tool) => tool.name);
      expect(names, item.id).toContain(item.toolName);
    }
  });
  it("accepts a Russian answer grounded in the service result", () => {
    expect(
      scoreGroundedAnswer({
        ...service,
        answer: "Найдена услуга «Монтаж коротких видео» за $30, срок 2 дня.",
      }),
    ).toEqual({ pass: true, issues: [] });
  });

  it("flags a price absent from the user request and tool result", () => {
    expect(
      scoreGroundedAnswer({
        ...service,
        answer: "Найдена услуга «Монтаж коротких видео» за $95.",
      }).issues,
    ).toContain("unsupported_price:9500");
  });

  it("flags a missing factual name", () => {
    expect(
      scoreGroundedAnswer({
        ...service,
        answer: "Найдена услуга за $30.",
      }).issues,
    ).toContain("missing_fact:Монтаж коротких видео");
  });

  it("flags the wrong response language", () => {
    expect(
      scoreGroundedAnswer({
        ...service,
        answer: "Video editing costs $30.",
      }).issues,
    ).toContain("language:ru");
  });

  it("rejects a fabricated result from an empty catalog", () => {
    expect(
      scoreGroundedAnswer({
        locale: "en",
        userText: "Find remote jobs",
        toolResult: "No published jobs found.",
        requiredFacts: [],
        empty: true,
        answer: "I found a remote role paying $80,000.",
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        "empty_result_claim",
        "unsupported_price:8000000",
      ]),
    );
  });

  it("accepts an honest empty answer in English", () => {
    expect(
      scoreGroundedAnswer({
        locale: "en",
        userText: "Find remote jobs",
        toolResult: "No published jobs found.",
        requiredFacts: [],
        empty: true,
        answer: "I found no published jobs. Try changing your filters.",
      }),
    ).toEqual({ pass: true, issues: [] });
  });

  it.each([
    "По этому запросу вакансий не найдено. Попробуйте изменить фильтры.",
    "Опубликованных вакансий дизайнера не нашлось.",
    "Опубликованного ориентира цены для этой категории не нашлось.",
  ])("accepts an honest empty answer in Russian: %s", (answer) => {
    expect(
      scoreGroundedAnswer({
        locale: "ru",
        userText: "Найди опубликованные вакансии дизайнера на платформе.",
        toolResult: "Опубликованных вакансий по запросу нет.",
        requiredFacts: [],
        empty: true,
        answer,
      }),
    ).toEqual({ pass: true, issues: [] });
  });

  it.each([
    "На платформе сейчас нет опубликованных вакансий с названием «дизайнер».",
    "Сейчас нет опубликованных услуг по этому запросу.",
  ])("accepts an honest Russian answer that says none exist: %s", (answer) => {
    expect(
      scoreGroundedAnswer({
        locale: "ru",
        userText: "Найди опубликованные вакансии дизайнера на платформе.",
        toolResult: "Опубликованных вакансий по запросу нет.",
        requiredFacts: [],
        empty: true,
        answer,
      }),
    ).toEqual({ pass: true, issues: [] });
  });

  it.each([
    "I couldn't find any published podcast editing services.",
    "There are no matching events in Rome right now.",
  ])("accepts an honest English answer: %s", (answer) => {
    expect(
      scoreGroundedAnswer({
        locale: "en",
        userText: "Find published Web3 events in Rome.",
        toolResult: "No published events found in Rome for this topic.",
        requiredFacts: [],
        empty: true,
        answer,
      }),
    ).toEqual({ pass: true, issues: [] });
  });

  it("flags a fabricated match even when the answer also says the catalog is empty", () => {
    expect(
      scoreGroundedAnswer({
        locale: "en",
        userText: "Find remote jobs",
        toolResult: "No published jobs found.",
        requiredFacts: [],
        empty: true,
        answer: "No published jobs match, but I found a Remote Designer role.",
      }).issues,
    ).toContain("empty_result_claim");
  });
});
