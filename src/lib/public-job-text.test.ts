import { describe, expect, it } from "vitest";
import { publicJobText } from "./public-job-text";

describe("publicJobText", () => {
  it("drops the snapshot lines that say the job was imported", () => {
    const raw = [
      "Founding Senior Fraud & Risk Engineer at Ihsan Pay.",
      "Imported from CryptoJobsList: the full description, requirements and how to apply are on the original posting (Apply opens it).",
      "",
      "Founding Senior Fraud & Risk Engineer — Ihsan Pay.",
      "Импортировано с CryptoJobsList: полное описание, требования и способ отклика — в оригинальной вакансии (кнопка «Откликнуться» откроет её).",
    ].join("\n");
    expect(publicJobText(raw)).toBe(
      [
        "Founding Senior Fraud & Risk Engineer at Ihsan Pay.",
        "",
        "Founding Senior Fraud & Risk Engineer — Ihsan Pay.",
      ].join("\n"),
    );
  });

  it("leaves a real description alone", () => {
    expect(publicJobText("Build APIs. Remote.")).toBe("Build APIs. Remote.");
  });
});
