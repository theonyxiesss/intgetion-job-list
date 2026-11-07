import { describe, expect, it } from "vitest";
import { chatOnlyTarget, isChatOpen } from "./chat-only";

describe("chat-only routing (TZ 53)", () => {
  it.each([
    ["/applications", "applications"],
    ["/saved-jobs", "saved"],
    ["/matches", "jobs"],
    ["/notifications/", "inbox"],
    ["/settings", "settings"],
    ["/settings/notifications", "settings"],
    ["/settings/privacy", "account"],
    ["/settings/assistants", "assistants"],
    ["/profile/edit", "profile"],
    ["/employer/jobs/123/stats", "myJobs"],
    ["/pricing", "plans"],
    ["/billing", "billing"],
    ["/login", "signin"],
    ["/register", "signup"],
  ])("sends %s to the chat as %s", (path, action) => {
    expect(chatOnlyTarget(path)).toBe(action);
  });

  it.each([
    "/",
    "/chat",
    "/billing/crypto",
    "/jobs",
    "/jobs/0d1f",
    "/companies/acme",
    "/events",
    "/freelance",
    "/salaries",
    "/privacy",
    "/terms",
    "/auth/callback",
    "/oauth/consent",
    "/reset-password",
    "/unsubscribe",
    "/admin",
    "/profiles",
  ])("keeps %s as a page", (path) => {
    expect(chatOnlyTarget(path)).toBeNull();
  });

  it("accepts only known actions from the address", () => {
    expect(isChatOpen("account")).toBe(true);
    expect(isChatOpen("javascript:alert(1)")).toBe(false);
    expect(isChatOpen(null)).toBe(false);
  });
});
