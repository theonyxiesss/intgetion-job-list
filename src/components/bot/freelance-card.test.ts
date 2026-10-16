import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import { cardText, FREELANCE_CARD_TOOLS } from "./freelance-copy";

describe("freelance card copy (D460, D462)", () => {
  it("lives outside the chat namespace that ships on every page", () => {
    expect("freelanceCard" in en.chat).toBe(false);
    for (const tool of FREELANCE_CARD_TOOLS) {
      expect(cardText(en.chatFreelance, `${tool}.title`)).not.toBe("");
    }
  });

  it("fills placeholders and reads a missing key as empty", () => {
    expect(
      cardText(en.chatFreelance, "package", {
        tier: "basic",
        price: "$450",
        days: 7,
      }),
    ).toBe("basic: $450, 7 d");
    expect(cardText(en.chatFreelance, "nope.title")).toBe("");
  });
});
