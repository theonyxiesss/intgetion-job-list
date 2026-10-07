import { describe, expect, it } from "vitest";
import { mailChannelAvailable } from "@/modules/auth/service";
import {
  NEW_JOB_TYPES,
  newJobChannelPreferences,
} from "@/components/notifications/new-job-types";

describe("new-job email switch (D349)", () => {
  it("writes the email channel for every new-job type", () => {
    const preferences = newJobChannelPreferences("email", true);
    expect(preferences.map((item) => item.type)).toEqual([...NEW_JOB_TYPES]);
    expect(preferences.every((item) => item.channel === "email" && item.enabled)).toBe(
      true,
    );
  });

  it("stays off for a Telegram placeholder or an unconfirmed address", () => {
    expect(
      mailChannelAvailable("tg1@telegram.intgetion.com", true),
    ).toBe(false);
    expect(mailChannelAvailable("ann@example.com", false)).toBe(false);
    expect(mailChannelAvailable(null, true)).toBe(false);
    expect(mailChannelAvailable("ann@example.com", true)).toBe(true);
  });
});
