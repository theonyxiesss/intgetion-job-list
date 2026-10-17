import { describe, expect, it } from "vitest";
import { systemPrompt } from "../prompts/system";
import { PITCH_MAX_CHARS, screenCoverNote } from "../service/pitch";
import { findTool, toolsFor } from "../service/tools";

describe("cover note screen (D475)", () => {
  it("keeps a plain letter and drops an empty one", () => {
    expect(
      screenCoverNote(
        "  I have 4 years with TypeScript and React and I work remotely.  ",
      ),
    ).toBe("I have 4 years with TypeScript and React and I work remotely.");
    expect(screenCoverNote("   ")).toBeNull();
    expect(screenCoverNote(undefined)).toBeNull();
  });

  it("refuses contacts and very long letters", () => {
    for (const note of [
      "Write to me at ada@example.com",
      "My portfolio: https://ada.dev",
      "Call +49 151 2345 6789",
    ]) {
      expect(() => screenCoverNote(note)).toThrow(
        expect.objectContaining({ code: "COVER_NOTE_CONTACTS" }),
      );
    }
    expect(() => screenCoverNote("a".repeat(PITCH_MAX_CHARS + 1))).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });
});

describe("pitch tools and prompt (D475)", () => {
  const ctx = { userId: "u1", conversationId: "c1", locale: "en", state: {} };

  it("reads facts without a card, signed-in only; applying still needs one", () => {
    expect(toolsFor(null).map((tool) => tool.name)).not.toContain(
      "get_pitch_facts",
    );
    expect(findTool("get_pitch_facts")?.confirm(ctx)).toBe(false);
    expect(findTool("apply_to_job")?.confirm(ctx)).toBe(true);
    expect(findTool("apply_to_job")?.preview).toBeTypeOf("function");
  });

  it("tells the model to stand up for the candidate from facts only", () => {
    const prompt = systemPrompt({ locale: "ru", signedIn: true });
    expect(prompt).toContain("PITCH.");
    expect(prompt).toContain("never invent an employer");
    expect(systemPrompt({ locale: "ru", signedIn: false })).not.toContain(
      "PITCH.",
    );
  });
});
