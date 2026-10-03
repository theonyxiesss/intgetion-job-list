import { describe, expect, it } from "vitest";
import {
  AUTH_EMAIL_TYPES,
  NOTIFICATION_CATALOG,
  NOTIFICATION_TYPES,
  isAuthEmailType,
  isNotificationType,
  notificationPayloadSchema,
  resolveDelivery,
} from "../lib/catalog";
import type { NotificationType } from "../lib/catalog";

/** Section 15 table, in order: type → email default. */
const SECTION_15_EMAIL_DEFAULTS: [NotificationType, boolean][] = [
  ["application.created", true],
  ["application.viewed", false],
  ["application.status_changed", true],
  ["application.withdrawn", false],
  ["mutual_interest.revealed", true],
  ["job.moderation_decided", true],
  ["job.expiring", true],
  ["job.closed", false],
  ["company.verification_decided", true],
  ["matches.digest", true],
  ["report.decided", false],
];

describe("notification catalog (15, D100)", () => {
  it("contains exactly the 11 types of section 15, in table order", () => {
    expect(NOTIFICATION_TYPES).toHaveLength(11);
    expect([...NOTIFICATION_TYPES]).toEqual(
      SECTION_15_EMAIL_DEFAULTS.map(([type]) => type),
    );
  });

  it("matches the section 15 email defaults", () => {
    for (const [type, emailDefault] of SECTION_15_EMAIL_DEFAULTS) {
      expect(NOTIFICATION_CATALOG[type].emailDefault).toBe(emailDefault);
    }
  });

  it("batches application.created and digests matches.digest", () => {
    expect(NOTIFICATION_CATALOG["application.created"].policy).toBe(
      "hourly_batch",
    );
    expect(NOTIFICATION_CATALOG["matches.digest"].policy).toBe("daily_digest");
    for (const type of NOTIFICATION_TYPES) {
      if (type !== "application.created" && type !== "matches.digest") {
        expect(NOTIFICATION_CATALOG[type].policy).toBe("immediate");
      }
    }
  });

  it("accepts a valid payload and rejects contact data and junk", () => {
    const schema = notificationPayloadSchema("application.created");
    const valid = {
      applicationId: "a1",
      jobId: "j1",
      jobTitle: "Backend Developer",
      candidateId: "u1",
    };
    expect(schema.safeParse(valid).success).toBe(true);
    // no contacts in payloads (D16, D23)
    expect(schema.safeParse({ ...valid, email: "a@b.c" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, phone: "+491701234567" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...valid, telegram: "@user" }).success).toBe(
      false,
    );
    const { candidateId: _omitted, ...missingField } = valid;
    void _omitted;
    expect(schema.safeParse(missingField).success).toBe(false); // missing candidateId
  });

  it("validates enums and digest payload shapes", () => {
    expect(
      notificationPayloadSchema("application.status_changed").safeParse({
        applicationId: "a1",
        jobId: "j1",
        jobTitle: "Backend Developer",
        status: "fired",
      }).success,
    ).toBe(false);
    expect(
      notificationPayloadSchema("application.status_changed").safeParse({
        applicationId: "a1",
        jobId: "j1",
        jobTitle: "Backend Developer",
        status: "offer",
      }).success,
    ).toBe(true);
    expect(
      notificationPayloadSchema("matches.digest").safeParse({
        matchCount: -1,
        sampleJobIds: [],
      }).success,
    ).toBe(false);
    expect(
      notificationPayloadSchema("matches.digest").safeParse({
        matchCount: 3,
        sampleJobIds: ["j1", "j2", "j3", "j4", "j5", "j6"],
      }).success,
    ).toBe(false);
  });

  it("keeps auth emails outside the catalog in a separate type domain", () => {
    expect(AUTH_EMAIL_TYPES).toHaveLength(3);
    for (const authType of AUTH_EMAIL_TYPES) {
      expect(isNotificationType(authType)).toBe(false);
      expect(isAuthEmailType(authType)).toBe(true);
    }
    expect(isAuthEmailType("application.created")).toBe(false);
  });
});

describe("resolveDelivery (15, D102)", () => {
  it("applies catalog defaults when there are no rows", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(resolveDelivery(type, "inapp", [])).toEqual({ allowed: true });
      expect(resolveDelivery(type, "email", []).allowed).toBe(
        NOTIFICATION_CATALOG[type].emailDefault,
      );
    }
  });

  it("lets preferences turn channels off", () => {
    const preferences = [
      { type: "application.status_changed", channel: "email", enabled: false },
    ];
    expect(
      resolveDelivery("application.status_changed", "email", preferences),
    ).toEqual({
      allowed: false,
      reason: "disabled_by_preference",
    });
  });

  it("lets preferences turn a default-off channel on", () => {
    const preferences = [
      { type: "application.viewed", channel: "email", enabled: true },
    ];
    expect(resolveDelivery("application.viewed", "email", preferences)).toEqual(
      {
        allowed: true,
      },
    );
    // inapp stays on by default even with unrelated rows
    expect(resolveDelivery("application.viewed", "inapp", preferences)).toEqual(
      {
        allowed: true,
      },
    );
  });

  it("rejects unknown types and channels", () => {
    expect(() =>
      resolveDelivery("made.up" as NotificationType, "email", []),
    ).toThrow();
    expect(() =>
      resolveDelivery("application.created", "sms" as "email", []),
    ).toThrow();
  });
});
