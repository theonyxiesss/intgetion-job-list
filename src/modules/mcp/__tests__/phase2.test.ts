import { describe, expect, it } from "vitest";
import { isValidMcpResource, MCP_SCOPES } from "../service/auth-service";
import { userMcpTools } from "../service/user-tools";
import {
  isPublicCimdAddress,
  validateCimdDocument,
  validateCimdUrl,
} from "../service/cimd";

describe("MCP Phase 2 authorization boundaries", () => {
  it("accepts only HTTPS CIMD URLs without credentials, fragments, or IP literals", () => {
    expect(
      validateCimdUrl("https://client.example/.well-known/mcp.json")?.hostname,
    ).toBe("client.example");
    expect(validateCimdUrl("http://client.example/client.json")).toBeNull();
    expect(
      validateCimdUrl("https://user@client.example/client.json"),
    ).toBeNull();
    expect(validateCimdUrl("https://127.0.0.1/client.json")).toBeNull();
    expect(
      validateCimdUrl("https://client.example/client.json#fragment"),
    ).toBeNull();
  });

  it("requires the CIMD document to identify itself and use safe redirect URI schemes", () => {
    const id = "https://client.example/client.json";
    const valid = {
      client_id: id,
      client_name: "Example",
      redirect_uris: ["https://client.example/callback"],
    };
    expect(validateCimdDocument(valid, id)?.client_name).toBe("Example");
    expect(
      validateCimdDocument(
        { ...valid, client_id: "https://other.example/" },
        id,
      ),
    ).toBeNull();
    expect(
      validateCimdDocument(
        { ...valid, redirect_uris: ["javascript:alert(1)"] },
        id,
      ),
    ).toBeNull();
    expect(
      validateCimdDocument(
        { ...valid, redirect_uris: ["https://user@example.com/callback"] },
        id,
      ),
    ).toBeNull();
  });

  it("rejects non-public IPv4 and IPv6 ranges for CIMD DNS answers", () => {
    expect(isPublicCimdAddress("93.184.216.34")).toBe(true);
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.20.1.4",
      "192.168.1.2",
      "169.254.1.2",
      "100.64.0.1",
      "224.0.0.1",
    ]) {
      expect(isPublicCimdAddress(address)).toBe(false);
    }
    expect(isPublicCimdAddress("2001:4860:4860::8888")).toBe(true);
    expect(isPublicCimdAddress("fe80::1")).toBe(false);
    expect(isPublicCimdAddress("2001:db8::1")).toBe(false);
    expect(isPublicCimdAddress("2002:7f00:1::")).toBe(false);
    expect(isPublicCimdAddress("3fff::1")).toBe(false);
    expect(isPublicCimdAddress("::1")).toBe(false);
  });

  it("accepts only an MCP resource URL on HTTPS or loopback HTTP", () => {
    expect(isValidMcpResource("https://intgetion.com/api/mcp")).toBe(true);
    expect(isValidMcpResource("http://localhost:3000/api/mcp")).toBe(true);
    // This checks URL shape only. The authorization endpoint separately
    // requires the resource to equal this MCP server's exact audience.
    expect(isValidMcpResource("https://evil.example/api/mcp")).toBe(true);
    expect(
      isValidMcpResource(
        "https://intgetion.com/api/mcp?redirect=https://evil.example",
      ),
    ).toBe(false);
    expect(isValidMcpResource("http://evil.example/api/mcp")).toBe(false);
    expect(isValidMcpResource("https://intgetion.com/api/other")).toBe(false);
  });

  it("exposes personal tools only for scopes granted to that token", () => {
    const principal = {
      userId: "00000000-0000-4000-8000-000000000001",
      clientId: "intg_test",
      scopes: ["applications:read" as const],
      expiresAt: 1_800_000_000,
      resource: "https://intgetion.com/api/mcp",
    };
    expect(userMcpTools(principal).map((tool) => tool.name)).toEqual([
      "get_my_applications",
    ]);
    expect(MCP_SCOPES).toEqual([
      "profile:read",
      "applications:read",
      "saved:read",
      "freelance:read",
      "ugc:read",
      "reminders:read",
    ]);
    expect(
      userMcpTools({ ...principal, scopes: ["profile:read"] }).map(
        (tool) => tool.name,
      ),
    ).toContain("get_my_standing");
    expect(
      userMcpTools({ ...principal, scopes: ["freelance:read"] }).map(
        (tool) => tool.name,
      ),
    ).toContain("get_my_services");
  });
});
