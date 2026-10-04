import { describe, expect, it } from "vitest";
import { AnthropicProvider } from "@/lib/llm";
import { goldenDialog } from "../../../../evals/schema";
import { loadGolden } from "../service/eval-run";
import {
  catalogSkillSlug,
  draftFromExtraction,
  extractDraft,
  skillRecall,
} from "../service/extract";
import { SKILL_RECALL_MIN, TIMEZONE_ERRORS_MAX } from "../service/eval-run";
import { redactPii, wrapUntrusted } from "@/lib/llm";

const live = process.env.EVAL_LIVE === "1";

describe.skipIf(!live)("live evals (19.3)", () => {
  it("measures skill recall and timezone errors against Anthropic", async () => {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key)
      throw new Error("ANTHROPIC_API_KEY is required for pnpm eval:live");
    const provider = new AnthropicProvider(key);
    const model =
      process.env.LLM_MODEL_EXTRACT?.trim() || "claude-haiku-4-5-20251001";
    const dialogs = loadGolden();
    let recall = 0;
    let timezoneErrors = 0;
    for (const dialog of dialogs) {
      goldenDialog.parse(dialog);
      const extracted = await extractDraft(
        provider,
        model,
        dialog.turns.map((turn) => ({
          role: "user" as const,
          content: wrapUntrusted("user_message", redactPii(turn.user)),
        })),
      );
      const { patch, timezoneDropped } = await draftFromExtraction(
        extracted.data,
        catalogSkillSlug,
      );
      if (timezoneDropped || patch?.timezone !== dialog.expected.timezone) {
        timezoneErrors += 1;
      }
      recall += skillRecall(
        dialog.expected.skills,
        (patch?.skills ?? []).map((skill) => skill.slug),
      );
    }
    expect(recall / dialogs.length).toBeGreaterThanOrEqual(SKILL_RECALL_MIN);
    expect(timezoneErrors).toBe(TIMEZONE_ERRORS_MAX);
  }, 300_000);
});
