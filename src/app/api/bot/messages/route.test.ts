import { describe, expect, it } from "vitest";
import { GET } from "./route";

const call = (query: string) =>
  GET(new Request(`http://localhost/api/bot/messages?${query}`));

describe("GET /api/bot/messages (D525)", () => {
  it("returns only the asked chat namespaces of the locale", async () => {
    const response = await call("locale=ru&ns=chat,ugc");
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["chat", "ugc"]);
    expect(response.headers.get("cache-control")).toContain("public");
  });

  it("refuses a namespace outside the chat's list", async () => {
    const response = await call("locale=en&ns=chat,admin");
    expect(response.status).toBe(400);
  });

  it("refuses an empty list and an unknown locale", async () => {
    expect((await call("locale=en&ns=")).status).toBe(400);
    expect((await call("locale=xx&ns=chat")).status).toBe(404);
    expect((await call("ns=chat")).status).toBe(404);
  });
});
