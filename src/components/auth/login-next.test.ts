import { describe, expect, it } from "vitest";
import {
  loginReturnLocation,
  oauthNext,
  planLoginNext,
} from "./login-next";

describe("oauth return", () => {
  it("keeps an allowlisted checkout and drops anything else", () => {
    expect(oauthNext("billing-plus", false)).toBe("billing-plus");
    expect(oauthNext("billing-team", false)).toBe("billing-team");
    expect(oauthNext("chat", false)).toBe("chat");
    expect(oauthNext("https://evil.example", false)).toBeUndefined();
    expect(oauthNext("billing-plus", true)).toBeUndefined();
    expect(oauthNext(null, false)).toBeUndefined();
  });

  it("builds the same checkout path the password form already uses", () => {
    expect(loginReturnLocation("en", "billing")).toEqual({
      pathname: "/billing/crypto",
      search: "?plan=hire",
    });
    expect(loginReturnLocation("ru", "billing-pro")).toEqual({
      pathname: "/ru/billing/crypto",
      search: "?plan=pro",
    });
    expect(loginReturnLocation("es", "chat")).toEqual({
      pathname: "/es/chat",
      search: "",
    });
    expect(planLoginNext("plus")).toBe("billing-plus");
  });
});
