import { describe, expect, it } from "vitest";
import { maxConnections } from "./client";

describe("connections per instance (D247)", () => {
  it("opens a few through the transaction pooler, one elsewhere", () => {
    expect(
      maxConnections(
        "postgresql://u:p@aws-0.pooler.supabase.com:6543/postgres",
      ),
    ).toBe(4);
    expect(
      maxConnections(
        "postgresql://u:p@aws-0.pooler.supabase.com:5432/postgres",
      ),
    ).toBe(1);
    expect(maxConnections("postgresql://u:p@127.0.0.1:54322/postgres")).toBe(1);
    expect(maxConnections("not a url")).toBe(1);
  });
});
