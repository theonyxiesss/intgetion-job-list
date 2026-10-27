import { describe, expect, it, vi } from "vitest";
import { askJevNouls, JEV_MODEL, JevError, type JevNoulQuestion } from "./jev";

const question: JevNoulQuestion = {
  type: "noul",
  instructions: "Does the reply say nothing was found?",
  criteria: { true: "It says so.", false: "It does not." },
};

describe("Jev decisions client (TZ 36, C4)", () => {
  it("sends the state and questions and reads the probabilities and cost", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body).toEqual({
        model: JEV_MODEL,
        state: { reply: "Нет вакансий." },
        questions: { honest: question },
      });
      expect((init.headers as Record<string, string>).authorization).toBe(
        "Bearer k",
      );
      return Response.json({
        model: "typesafe/jev-1.14-20261014",
        answers: { honest: { type: "noul", noul: 0.97 } },
        usage: { input_tokens: 400, output_tokens: 20, cost: 0.0000168 },
      });
    });
    const result = await askJevNouls({
      apiKey: "k",
      state: { reply: "Нет вакансий." },
      questions: { honest: question },
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result).toEqual({
      answers: { honest: 0.97 },
      costUsd: 0.0000168,
      inputTokens: 400,
      model: "typesafe/jev-1.14-20261014",
    });
  });

  it("fails with the status when OpenRouter refuses, for example without credits", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 402 }));
    await expect(
      askJevNouls({
        apiKey: "k",
        state: "x",
        questions: { honest: question },
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toMatchObject({ name: "JevError", status: 402 });
  });

  it("fails when an answer is missing or out of range", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ answers: { honest: { noul: 2 } } }),
    );
    await expect(
      askJevNouls({
        apiKey: "k",
        state: "x",
        questions: { honest: question },
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(JevError);
  });
});
