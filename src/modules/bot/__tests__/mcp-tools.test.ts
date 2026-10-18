import { describe, expect, it } from "vitest";
import {
  TOOLS,
  mcpTools,
  runMcpTool,
  runTool,
  toolsFor,
  type ToolContext,
} from "../service";

const guest: ToolContext = {
  userId: null,
  conversationId: "c",
  locale: "en",
  state: {},
};

describe("one registry, two channels (D480, D486)", () => {
  it("every tool on MCP is a guest read: no card, no sign-in", () => {
    const onMcp = TOOLS.filter((t) => t.mcp !== undefined);
    expect(onMcp.length).toBeGreaterThan(0);
    for (const t of onMcp) {
      expect(t.access, t.name).toBe("guest");
      expect(t.confirm(guest), t.name).toBe(false);
      expect(t.confirm({ ...guest, userId: "user-1" }), t.name).toBe(false);
    }
  });

  it("MCP gets exactly the agreed first-version tools", () => {
    expect(mcpTools().map((t) => t.name)).toEqual([
      "search_jobs",
      "get_job",
      "find_events",
      "list_job_categories",
      "get_company",
      "find_services",
      "get_service",
      "freelance_price_range",
    ]);
  });

  it("Spoki does not get the MCP-only tools", () => {
    for (const userId of [null, "user-1"]) {
      const names = toolsFor(userId).map((t) => t.name);
      expect(names).not.toContain("list_job_categories");
      expect(names).not.toContain("get_company");
    }
  });

  it("Spoki cannot run an MCP-only tool by name", async () => {
    await expect(
      runTool(guest, "get_company", { slug: "acme" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each(["apply_to_job", "save_job", "get_my_profile", "offer_step"])(
    "MCP cannot run %s",
    async (name) => {
      await expect(runMcpTool(name, {})).rejects.toMatchObject({
        status: 400,
        code: "VALIDATION_ERROR",
      });
    },
  );

  it("MCP rejects arguments outside the schema before anything runs", async () => {
    await expect(
      runMcpTool("get_company", { slug: "../etc/passwd" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      runMcpTool("search_jobs", { limit: 50 }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
