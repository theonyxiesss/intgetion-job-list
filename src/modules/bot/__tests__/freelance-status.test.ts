import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "@/lib/http";

const listing = vi.hoisted(() => ({
  getOwnService: vi.fn(),
  setServicePaused: vi.fn(),
}));
const orders = vi.hoisted(() => ({ listOrders: vi.fn() }));

vi.mock("@/modules/freelance/service/listing-service", async (original) => ({
  ...(await original<object>()),
  ...listing,
}));
vi.mock("@/modules/freelance/service/order-service", async (original) => ({
  ...(await original<object>()),
  ...orders,
}));

const { ACCOUNT_CARD_TOOLS } = await import("@/components/bot/account-card");
const { systemPrompt } = await import("../prompts/system");
const { findTool, hashArgs, runTool, toolPreview, toolsFor } =
  await import("../service/tools");

const SERVICE = "00000000-0000-4000-8000-000000000077";
const ctx = { userId: "u1", conversationId: "c1", locale: "en", state: {} };
const own = {
  id: SERVICE,
  title: "Landing page in a week",
  status: "published",
  category: "development",
  description: "I build a landing page.",
  moderationNote: null,
  packages: [],
};

function confirmed(tool: string, args: unknown) {
  return { tool, userId: ctx.userId, argsHash: hashArgs(tool, args) };
}

beforeEach(() => {
  vi.clearAllMocks();
  listing.getOwnService.mockResolvedValue(own);
  listing.setServicePaused.mockImplementation(async (_u, _id, paused) => ({
    ...own,
    status: paused ? "paused" : "published",
  }));
  orders.listOrders.mockResolvedValue([
    { serviceId: SERVICE, status: "in_progress" },
    { serviceId: SERVICE, status: "completed" },
    { serviceId: SERVICE, status: "completed" },
    { serviceId: "other", status: "completed" },
  ]);
});

describe("own freelance service in Spoki (stage 3, D500)", () => {
  it("is for signed-in people; the pause is a card that names the service", async () => {
    const guest = toolsFor(null).map((tool) => tool.name);
    expect(guest).not.toContain("set_service_status");
    expect(guest).not.toContain("get_my_service");
    const tool = findTool("set_service_status")!;
    expect(tool.confirm(ctx)).toBe(true);
    expect(findTool("get_my_service")!.confirm(ctx)).toBe(false);
    expect(ACCOUNT_CARD_TOOLS).toContain("set_service_status");
    await expect(
      toolPreview(ctx, "set_service_status", {
        serviceId: SERVICE,
        action: "pause",
      }),
    ).resolves.toBe("Landing page in a week");
  });

  it("shows no card for someone else's service", async () => {
    listing.getOwnService.mockRejectedValueOnce(notFound());
    await expect(
      toolPreview(ctx, "set_service_status", {
        serviceId: SERVICE,
        action: "pause",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("pauses and resumes only after the matching card", async () => {
    const pause = { serviceId: SERVICE, action: "pause" };
    await expect(
      runTool(ctx, "set_service_status", pause),
    ).rejects.toMatchObject({ status: 422 });
    expect(listing.setServicePaused).not.toHaveBeenCalled();

    const paused = await runTool(
      ctx,
      "set_service_status",
      pause,
      confirmed("set_service_status", pause),
    );
    expect(listing.setServicePaused).toHaveBeenLastCalledWith(
      "u1",
      SERVICE,
      true,
    );
    expect(paused.llm).toContain("paused");

    const resume = { serviceId: SERVICE, action: "resume" };
    await runTool(
      ctx,
      "set_service_status",
      resume,
      confirmed("set_service_status", resume),
    );
    expect(listing.setServicePaused).toHaveBeenLastCalledWith(
      "u1",
      SERVICE,
      false,
    );
  });

  it("reads one own service with its orders by status", async () => {
    const outcome = await runTool(ctx, "get_my_service", {
      serviceId: SERVICE,
    });
    expect(outcome.llm).toContain("Landing page in a week");
    expect(outcome.llm).toContain("I build a landing page.");
    expect(outcome.llm).toContain('"orders":{"in_progress":1,"completed":2}');
  });

  it("tells Spoki that delete means pause", () => {
    const prompt = systemPrompt({ locale: "en", signedIn: true });
    expect(prompt).toContain(
      "set_service_status pauses or resumes one service",
    );
    expect(prompt).toContain("delete means pause");
  });
});
