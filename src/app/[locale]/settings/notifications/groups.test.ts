import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES } from "@/modules/notifications/service";
import { NOTIFICATION_GROUPS } from "./groups";

describe("notification groups", () => {
  it("put every notification type in exactly one group", () => {
    const grouped = NOTIFICATION_GROUPS.flatMap((group) => [...group.types]);
    expect([...grouped].sort()).toEqual([...NOTIFICATION_TYPES].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});
