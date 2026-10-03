import { describe, expect, it } from "vitest";
import { createLogger, describeError, logger, scrubText } from "./logger";
import { normalizeRequestId } from "./request-id";

describe("scrubText (18.1: no PII in logs)", () => {
  it("masks emails, phones, bearer tokens and connection strings", () => {
    const text = scrubText(
      "user ana@example.com +7 (912) 345-67-89 Bearer abc.def.ghi postgresql://u:p@h:5432/db",
    );
    expect(text).not.toContain("ana@example.com");
    expect(text).not.toContain("345-67-89");
    expect(text).not.toContain("abc.def.ghi");
    expect(text).not.toContain("u:p@h");
    expect(text).toContain("[email]");
    expect(text).toContain("[phone]");
    expect(text).toContain("Bearer [token]");
    expect(text).toContain("[connection]");
  });

  it("leaves ordinary text, short numbers and dates alone", () => {
    expect(scrubText("job 42 failed after 3 tries")).toBe(
      "job 42 failed after 3 tries",
    );
    expect(scrubText("expired on 2026-10-03 at 10:00")).toBe(
      "expired on 2026-10-03 at 10:00",
    );
  });

  it("masks phones written without a plus", () => {
    expect(scrubText("call 8 912 345 67 89")).toBe("call [phone]");
  });
});

describe("describeError", () => {
  it("keeps the type, a scrubbed message and the driver code", () => {
    const error = new Error("duplicate key for ana@example.com", {
      cause: { code: "23505" },
    });
    expect(describeError(error)).toEqual({
      type: "Error",
      message: "duplicate key for [email]",
      code: "23505",
    });
  });

  it("does not echo non-Error values", () => {
    expect(describeError("ana@example.com")).toEqual({ type: "string" });
  });
});

describe("logger redaction", () => {
  function capture() {
    const lines: Record<string, unknown>[] = [];
    const log = createLogger(
      { write: (line: string) => void lines.push(JSON.parse(line)) },
      "info",
    );
    return { log, lines };
  }

  it("censors sensitive keys at the top level and one level down", () => {
    const { log, lines } = capture();
    log.info(
      {
        email: "ana@example.com",
        ip: "203.0.113.7",
        user: { password: "orbit-lantern-42", token: "t", id: "u1" },
        requestId: "abcd-1234-efgh",
      },
      "sign-in",
    );
    const line = lines[0]!;
    expect(line.email).toBe("[redacted]");
    expect(line.ip).toBe("[redacted]");
    expect(line.user).toEqual({
      password: "[redacted]",
      token: "[redacted]",
      id: "u1",
    });
    expect(line.requestId).toBe("abcd-1234-efgh");
    expect(line.service).toBe("intgetion-job-list");
    expect(JSON.stringify(line)).not.toContain("ana@example.com");
  });

  it("is silent under vitest by default", () => {
    expect(logger.level).toBe("silent");
  });
});

describe("normalizeRequestId", () => {
  it("keeps a well-formed id and replaces anything else", () => {
    expect(normalizeRequestId("abcd-1234-efgh")).toBe("abcd-1234-efgh");
    for (const bad of [
      null,
      "short",
      "has spaces in it",
      "x".repeat(65),
      "<script>",
    ]) {
      const id = normalizeRequestId(bad);
      expect(id).not.toBe(bad);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});
