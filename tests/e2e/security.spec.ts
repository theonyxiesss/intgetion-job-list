import { expect, test } from "@playwright/test";

/** Subphase 1B: CSRF (P12), rate limits (P15), security headers and CSP. */

const site = "http://127.0.0.1:3000";

function uniqueEmail(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

test("P12: cross-origin and Origin-less writes are refused", async ({
  request,
}) => {
  const body = { email: uniqueEmail("csrf"), locale: "en" };

  const foreign = await request.post("/api/auth/reset", {
    headers: { origin: "https://evil.example" },
    data: body,
  });
  expect(foreign.status()).toBe(403);
  expect((await foreign.json()).error.code).toBe("FORBIDDEN");

  const missing = await request.post("/api/auth/reset", { data: body });
  expect(missing.status()).toBe(403);

  const patch = await request.patch("/api/me", {
    headers: { origin: "http://127.0.0.1:3001" },
    data: { locale: "ru" },
  });
  expect(patch.status()).toBe(403);

  const same = await request.post("/api/auth/reset", {
    headers: { origin: site },
    data: body,
  });
  expect(same.status()).toBe(200);
});

test("P15: the email-link limit answers 429 with Retry-After", async ({
  request,
}) => {
  const body = { email: uniqueEmail("limit"), locale: "en" };
  for (let i = 0; i < 3; i += 1) {
    const ok = await request.post("/api/auth/reset", {
      headers: { origin: site },
      data: body,
    });
    expect(ok.status()).toBe(200);
  }
  const limited = await request.post("/api/auth/reset", {
    headers: { origin: site },
    data: body,
  });
  expect(limited.status()).toBe(429);
  expect((await limited.json()).error.code).toBe("RATE_LIMITED");
  const retryAfter = Number(limited.headers()["retry-after"]);
  expect(retryAfter).toBeGreaterThan(0);
  expect(retryAfter).toBeLessThanOrEqual(3600);
});

test("P15: repeated failed logins are limited per address", async ({
  request,
}) => {
  const body = { email: uniqueEmail("login"), password: "not-the-password" };
  for (let i = 0; i < 5; i += 1) {
    const denied = await request.post("/api/auth/login", {
      headers: { origin: site },
      data: body,
    });
    expect(denied.status()).toBe(401);
  }
  const limited = await request.post("/api/auth/login", {
    headers: { origin: site },
    data: body,
  });
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBeTruthy();
});

test("pages carry a nonce CSP and the security headers", async ({ page }) => {
  const response = await page.goto("/en");
  const headers = response?.headers() ?? {};
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("unsafe-inline");
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();

  // Every inline script carries this request's nonce, so none is blocked.
  const scripts = await page
    .locator("script:not([src])")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLScriptElement).nonce),
    );
  expect(scripts.length).toBeGreaterThan(0);
  for (const value of scripts) expect(value).toBe(nonce);

  const second = await page.goto("/en");
  expect(second?.headers()["content-security-policy"]).not.toBe(csp);
});

test("the CSP blocks nothing on the auth pages", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  for (const path of ["/en", "/en/login", "/en/register"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});

test("API responses forbid framing and content", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.headers()["content-security-policy"]).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
});

test("the cron endpoint hides itself without the secret", async ({
  request,
}) => {
  const response = await request.get("/api/cron/rate-limit-gc", {
    headers: { authorization: "Bearer wrong" },
  });
  expect(response.status()).toBe(404);
});
