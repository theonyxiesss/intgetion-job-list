import { describe, expect, it } from "vitest";
import { systemPrompt } from "../prompts/system";
import { offerPath } from "../service/offers";

describe("account data and AI assistants stay out of the chat (TZ 53)", () => {
  it("opens the chat home's panels for a signed-in person only", () => {
    expect(offerPath("account_data", true)).toBe("/?panel=account");
    expect(offerPath("assistants", true)).toBe("/?panel=assistants");
    expect(offerPath("account_data", false)).toBeNull();
    expect(offerPath("assistants", false)).toBeNull();
  });

  it("tells Spoki never to handle a token in the conversation", () => {
    const prompt = systemPrompt({ locale: "en", signedIn: true });
    expect(prompt).toContain("offer_step with account_data");
    expect(prompt).toContain(
      "Never ask for, repeat or write out a token in the chat.",
    );
  });
});
