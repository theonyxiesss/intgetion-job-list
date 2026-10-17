import { describe, expect, it } from "vitest";
import { ACCOUNT_CARD_TOOLS } from "@/components/bot/account-card";
import en from "@/messages/en.json";
import { systemPrompt } from "../prompts/system";
import { accountTools } from "../service/account-tools";
import { reminderTools } from "../service/reminders";
import { hashArgs, runTool, toolPreview, toolsFor } from "../service/tools";

const ctx = { userId: "u1", conversationId: "c1", locale: "en", state: {} };
const writes = accountTools.filter((tool) => tool.confirm(ctx));
const reads = accountTools.filter((tool) => !tool.confirm(ctx));

describe("account tools (D472)", () => {
  it("are for signed-in people only", () => {
    const guest = toolsFor(null).map((tool) => tool.name);
    for (const tool of accountTools) {
      expect(tool.access).toBe("user");
      expect(guest).not.toContain(tool.name);
    }
    expect(reads.map((tool) => tool.name).sort()).toEqual([
      "get_my_follows",
      "get_my_saved_jobs",
      "get_my_saved_searches",
      "get_my_settings",
    ]);
  });

  it("confirm every write on a card that names its target", () => {
    const cardTools = [...writes, ...reminderTools].filter((tool) =>
      tool.confirm(ctx),
    );
    expect(cardTools.map((tool) => tool.name).sort()).toEqual(
      [...ACCOUNT_CARD_TOOLS].sort(),
    );
    for (const tool of cardTools) {
      expect(tool.preview).toBeTypeOf("function");
    }
    const copy = en.chat.account as Record<string, string>;
    for (const name of ACCOUNT_CARD_TOOLS) expect(copy[name]).toBeTruthy();
  });

  it("refuses a write without a matching confirmation", async () => {
    await expect(
      runTool(ctx, "set_profile_hidden", { hidden: true }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      runTool(
        ctx,
        "set_profile_hidden",
        { hidden: true },
        {
          tool: "set_profile_hidden",
          userId: ctx.userId,
          argsHash: hashArgs("set_profile_hidden", { hidden: false }),
        },
      ),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      runTool({ ...ctx, userId: null }, "withdraw_application", {
        applicationId: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("does not save an empty search and validates ids", async () => {
    await expect(
      toolPreview(ctx, "save_search", { name: "Nothing" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      toolPreview(ctx, "unsave_job", { jobId: "not-a-uuid" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("tells a signed-in person what Spoki may change and what stays on the site", () => {
    const prompt = systemPrompt({ locale: "en", signedIn: true });
    expect(prompt).toContain("ACCOUNT.");
    expect(prompt).toContain("deleting the account stay on the site");
    expect(systemPrompt({ locale: "en", signedIn: false })).not.toContain(
      "ACCOUNT.",
    );
  });
});

describe("account card copy (D472)", () => {
  it("formats in every locale with the target name", async () => {
    const { createTranslator } = await import("next-intl");
    const locales = ["en", "ru", "es", "pt-BR", "de", "fr", "it"] as const;
    for (const locale of locales) {
      const messages = (await import(`@/messages/${locale}.json`)).default;
      const t = createTranslator({ locale, messages });
      for (const name of ACCOUNT_CARD_TOOLS) {
        const text = t(
          `chat.account.${name}` as never,
          {
            name: "Acme",
            on: "true",
            channel: "Email",
          } as never,
        );
        expect(text).not.toContain("{");
        if (!["set_profile_hidden", "set_morning_briefs"].includes(name)) {
          expect(text).toContain("Acme");
        }
      }
    }
  });
});
