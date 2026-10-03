import { describe, expect, it } from "vitest";
import { hasSessionMark, markSession, SESSION_HEADER } from "./session-mark";

describe("session mark", () => {
  it("overwrites a value the client sent", () => {
    const headers = new Headers({ [SESSION_HEADER]: "1" });
    markSession(headers, false);
    expect(hasSessionMark(headers)).toBe(false);
  });

  it("marks a signed-in request", () => {
    const headers = new Headers();
    markSession(headers, true);
    expect(hasSessionMark(headers)).toBe(true);
  });

  it("treats a missing or odd value as a guest", () => {
    expect(hasSessionMark(new Headers())).toBe(false);
    expect(hasSessionMark(new Headers({ [SESSION_HEADER]: "true" }))).toBe(
      false,
    );
  });
});
