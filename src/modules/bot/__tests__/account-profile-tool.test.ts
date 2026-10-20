import { beforeEach, describe, expect, it, vi } from "vitest";

const users = vi.hoisted(() => ({
  patchSharedProfile: vi.fn(),
  readSharedProfile: vi.fn(),
}));

vi.mock("@/modules/users/service", async (original) => ({
  ...(await original<object>()),
  ...users,
}));

const { ACCOUNT_CARD_TOOLS } = await import("@/components/bot/account-card");
const { systemPrompt } = await import("../prompts/system");
const { sharedDraft } = await import("../service/user-memory");
const { findTool, hashArgs, runTool, toolPreview, toolsFor } =
  await import("../service/tools");

const ctx = { userId: "u1", conversationId: "c1", locale: "ru", state: {} };

beforeEach(() => {
  vi.clearAllMocks();
  users.readSharedProfile.mockResolvedValue({ displayName: "Anna" });
  users.patchSharedProfile.mockResolvedValue({
    displayName: "Anna",
    country: "PL",
    city: "Warsaw",
    timezone: "Europe/Warsaw",
    languages: [{ code: "pl", level: "native" }],
    about: null,
  });
});

describe("Spoki and the shared profile (stage 6.3, D505)", () => {
  it("is a card for signed-in people, also in a UGC-free general thread", () => {
    expect(toolsFor(null).map((t) => t.name)).not.toContain(
      "propose_account_update",
    );
    expect(toolsFor("u1").map((t) => t.name)).toContain(
      "propose_account_update",
    );
    expect(findTool("propose_account_update")!.confirm(ctx)).toBe(true);
    expect(ACCOUNT_CARD_TOOLS).toContain("propose_account_update");
  });

  it("asks again instead of showing a card with nothing or a bad value", async () => {
    await expect(
      toolPreview(ctx, "propose_account_update", {}),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      toolPreview(ctx, "propose_account_update", { country: "Poland" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      toolPreview(ctx, "propose_account_update", { timezone: "Mars/Base" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      toolPreview(ctx, "propose_account_update", { country: "PL" }),
    ).resolves.toBe("Anna");
  });

  it("changes the profile only after the card", async () => {
    const args = { country: "PL", city: "Warsaw" };
    await expect(
      runTool(ctx, "propose_account_update", args),
    ).rejects.toMatchObject({ status: 422 });
    expect(users.patchSharedProfile).not.toHaveBeenCalled();
    const outcome = await runTool(ctx, "propose_account_update", args, {
      tool: "propose_account_update",
      userId: "u1",
      argsHash: hashArgs("propose_account_update", args),
    });
    expect(users.patchSharedProfile).toHaveBeenCalledWith("u1", args);
    expect(outcome.llm).toContain("every role");
  });

  it("gives Spoki the shared profile as known facts", () => {
    expect(
      sharedDraft({
        displayName: "Anna",
        country: "PL",
        city: null,
        timezone: "Europe/Warsaw",
        languages: [{ code: "en", level: "C1" }],
      }),
    ).toEqual({
      displayName: "Anna",
      country: "PL",
      timezone: "Europe/Warsaw",
      languages: [{ lang: "en", level: "C1" }],
    });
    expect(sharedDraft(null)).toEqual({});
  });

  it("tells Spoki to use it when they move or learn a language", () => {
    expect(systemPrompt({ locale: "en", signedIn: true })).toContain(
      "call propose_account_update with only that",
    );
  });
});
