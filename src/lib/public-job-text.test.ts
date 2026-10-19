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

  it("mends the Latin-1 reading of a no-break space (D479)", () => {
    const broken = String.fromCharCode(0xc2, 0xa0);
    expect(
      publicJobText(`About${broken}the${broken}Company: Kodland${broken}is`),
    ).toBe("About the Company: Kodland is");
    expect(publicJobText(`Pay${String.fromCharCode(0xa0)}in USD`)).toBe(
      "Pay in USD",
    );
  });

  it("leaves a real description alone", () => {
    expect(publicJobText("Build APIs. Remote.")).toBe("Build APIs. Remote.");
  });
});
