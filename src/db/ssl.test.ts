import { X509Certificate } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hostedSsl, SUPABASE_ROOT_CA_2021, withoutSslMode } from "./ssl";

// Fingerprint of prod-ca-2021.crt as published in supabase/cli.
const rootFingerprint =
  "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

describe("hosted TLS", () => {
  it("pins the Supabase Root 2021 CA", () => {
    const cert = new X509Certificate(SUPABASE_ROOT_CA_2021);
    expect(cert.fingerprint256).toBe(rootFingerprint);
    expect(cert.subject).toContain("CN=Supabase Root 2021 CA");
  });

  it("keeps the embedded CA equal to the pem file the scripts read", () => {
    const pem = fs.readFileSync(
      path.join(process.cwd(), "src/db/supabase-root-2021-ca.pem"),
      "utf8",
    );
    // A Windows checkout may turn LF into CRLF.
    expect(SUPABASE_ROOT_CA_2021.trim()).toBe(
      pem.replace(/\r\n/g, "\n").trim(),
    );
  });

  it("verifies the chain for hosted databases", () => {
    const ssl = hostedSsl(
      "postgres://app_rw.ref:x@aws-1-eu-central-1.pooler.supabase.com:5432/postgres",
    );
    expect(ssl).toEqual({
      ca: SUPABASE_ROOT_CA_2021,
      rejectUnauthorized: true,
    });
  });

  it("skips TLS for loopback databases", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(hostedSsl(`postgres://u:p@${host}:54322/postgres`)).toBe(
        undefined,
      );
    }
  });

  it("drops sslmode from the URL", () => {
    expect(withoutSslMode("postgres://u:p@h:5432/db?sslmode=require&x=1")).toBe(
      "postgres://u:p@h:5432/db?x=1",
    );
  });
});
