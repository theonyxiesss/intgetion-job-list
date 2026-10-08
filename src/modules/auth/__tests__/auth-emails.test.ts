import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  authEmailKindFromAction,
  authVerifyUrl,
  publicAuthRedirect,
  renderAuthEmail,
} from "../service/auth-emails";
import {
  handleSendEmailHook,
  verifySendEmailHookSignature,
} from "../service/send-email-hook";
import type { EmailSender } from "@/modules/notifications/service/email-sender";

describe("auth email letters (D325)", () => {
  it("maps Auth action types", () => {
    expect(authEmailKindFromAction("signup")).toBe("signup");
    expect(authEmailKindFromAction("recovery")).toBe("recovery");
    expect(authEmailKindFromAction("magiclink")).toBe("magiclink");
    expect(authEmailKindFromAction("weird")).toBeNull();
  });

  it("builds the Brazilian Portuguese magic link letter (D350)", () => {
    const letter = renderAuthEmail({
      kind: "magiclink",
      locale: "pt-BR",
      actionHref: "https://example.supabase.co/auth/v1/verify?token=abc",
    });
    expect(letter.subject).toContain("Seu link de acesso");
    expect(letter.html).toContain('lang="pt-BR"');
  });

  it("builds a branded recovery letter", () => {
    const letter = renderAuthEmail({
      kind: "recovery",
      locale: "en",
      actionHref: "https://example.supabase.co/auth/v1/verify?token=abc",
    });
    expect(letter.subject).toContain("Reset");
    expect(letter.html).toContain("INTGETION JOB LIST");
    expect(letter.html).toContain("Choose a new password");
    expect(letter.html).toContain(
      "https://example.supabase.co/auth/v1/verify?token=abc",
    );
    expect(letter.text).toContain(
      "https://example.supabase.co/auth/v1/verify?token=abc",
    );
  });

  it("builds the Russian signup letter", () => {
    const letter = renderAuthEmail({
      kind: "signup",
      locale: "ru",
      actionHref: "https://x.test/confirm",
    });
    expect(letter.subject).toContain("Подтвердите");
    expect(letter.html).toContain("Подтвердить почту");
  });

  it("builds the verify URL Auth expects", () => {
    expect(
      authVerifyUrl({
        supabaseUrl: "https://proj.supabase.co/",
        tokenHash: "hash1",
        type: "recovery",
        redirectTo: "https://intgetion.com/en/auth/callback?next=reset",
      }),
    ).toBe(
      "https://proj.supabase.co/auth/v1/verify?token=hash1&type=recovery&redirect_to=https%3A%2F%2Fintgetion.com%2Fen%2Fauth%2Fcallback%3Fnext%3Dreset",
    );
  });

  it("rewrites localhost redirect_to onto the public site (D326)", () => {
    expect(
      publicAuthRedirect(
        "http://localhost:3000/en/auth/callback?next=reset",
        "https://intgetion.com",
      ),
    ).toBe("https://intgetion.com/en/auth/callback?next=reset");
    expect(
      publicAuthRedirect(
        "http://127.0.0.1:3000/ru/auth/callback",
        "https://intgetion.com",
      ),
    ).toBe("https://intgetion.com/ru/auth/callback");
    expect(
      publicAuthRedirect(
        "https://intgetion.com/en/auth/callback",
        "https://intgetion.com",
      ),
    ).toBe("https://intgetion.com/en/auth/callback");
    expect(
      publicAuthRedirect(
        "https://evil.example/en/auth/callback",
        "https://intgetion.com",
      ),
    ).toBe("https://intgetion.com/en/auth/callback");
  });
});

describe("send-email hook signature (D325)", () => {
  const secret = `v1,whsec_${Buffer.from("hook-secret-bytes!!").toString("base64")}`;

  function sign(body: string, id: string, timestamp: string): string {
    const key = Buffer.from("hook-secret-bytes!!");
    const digest = createHmac("sha256", key)
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");
    return `v1,${digest}`;
  }

  it("accepts a fresh valid signature", () => {
    const body = "{}";
    const id = "msg_1";
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(
      verifySendEmailHookSignature(
        body,
        { id, timestamp, signature: sign(body, id, timestamp) },
        secret,
      ),
    ).toBe(true);
  });

  it("rejects a bad signature", () => {
    expect(
      verifySendEmailHookSignature(
        "{}",
        {
          id: "msg_1",
          timestamp: String(Math.floor(Date.now() / 1000)),
          signature: "v1,nope",
        },
        secret,
      ),
    ).toBe(false);
  });
});

describe("send-email hook handler (D325)", () => {
  const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const savedSite = process.env.NEXT_PUBLIC_SITE_URL;
  const savedSecret = process.env.AUTH_SEND_EMAIL_HOOK_SECRET;
  const secretBytes = Buffer.from("hook-secret-bytes!!");
  const secret = `v1,whsec_${secretBytes.toString("base64")}`;

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    if (savedSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = savedSite;
    if (savedSecret === undefined) {
      delete process.env.AUTH_SEND_EMAIL_HOOK_SECRET;
    } else process.env.AUTH_SEND_EMAIL_HOOK_SECRET = savedSecret;
  });

  function signedRequest(body: object) {
    const raw = JSON.stringify(body);
    const id = "msg_test";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `v1,${createHmac("sha256", secretBytes)
      .update(`${id}.${timestamp}.${raw}`)
      .digest("base64")}`;
    return {
      raw,
      headers: new Headers({
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": signature,
      }),
    };
  }

  it("sends a recovery letter through the mailer", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.NEXT_PUBLIC_SITE_URL = "https://intgetion.com";
    process.env.AUTH_SEND_EMAIL_HOOK_SECRET = secret;
    const sent: unknown[] = [];
    const mailer: EmailSender = {
      async send(message) {
        sent.push(message);
        return "sent";
      },
    };
    const { raw, headers } = signedRequest({
      user: { email: "a@example.com", user_metadata: { locale: "en" } },
      email_data: {
        token_hash: "tok",
        email_action_type: "recovery",
        redirect_to: "https://intgetion.com/en/auth/callback?next=reset",
      },
    });
    const result = await handleSendEmailHook(raw, headers, mailer, secret);
    expect(result).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    const message = sent[0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(message.to).toBe("a@example.com");
    expect(message.subject).toContain("Reset");
    expect(message.html).toContain("/auth/v1/verify?token=tok");
    expect(message.html).toContain(
      "redirect_to=https%3A%2F%2Fintgetion.com%2Fen%2Fauth%2Fcallback%3Fnext%3Dreset",
    );
    // Raw verify URL stays in text/plain, not as visible body text under the button.
    expect(message.text).toContain("/auth/v1/verify?token=tok");
  });

  it("rewrites localhost redirect_to before building the verify link", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.NEXT_PUBLIC_SITE_URL = "https://intgetion.com";
    process.env.AUTH_SEND_EMAIL_HOOK_SECRET = secret;
    const sent: unknown[] = [];
    const mailer: EmailSender = {
      async send(message) {
        sent.push(message);
        return "sent";
      },
    };
    const { raw, headers } = signedRequest({
      user: { email: "a@example.com", user_metadata: { locale: "en" } },
      email_data: {
        token_hash: "tok",
        email_action_type: "signup",
        redirect_to: "http://localhost:3000/en/auth/callback",
      },
    });
    const result = await handleSendEmailHook(raw, headers, mailer, secret);
    expect(result).toEqual({ ok: true });
    const message = sent[0] as { html: string };
    expect(message.html).toContain(
      "redirect_to=https%3A%2F%2Fintgetion.com%2Fen%2Fauth%2Fcallback",
    );
    expect(message.html).not.toContain("localhost");
  });

  it("refuses a missing signature", async () => {
    const result = await handleSendEmailHook(
      "{}",
      new Headers(),
      {
        async send() {
          return "sent";
        },
      },
      secret,
    );
    expect(result).toMatchObject({ ok: false, status: 401 });
  });
});
