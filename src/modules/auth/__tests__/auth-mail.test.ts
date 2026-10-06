import { beforeEach, describe, expect, it, vi } from "vitest";

let tokenHash: string | null = "hashed";
const minted: Array<{ type: string; email: string; password?: string }> = [];

vi.mock("@/lib/supabase/admin", () => ({
  authLinkTokenHash: (type: string, email: string, password?: string) => {
    minted.push({ type, email, password });
    return Promise.resolve(tokenHash);
  },
}));

const { sendAuthMail } = await import("../service/auth-mail");

type Message = { to: string; subject: string; text: string; html: string };

describe("our own letters for signing in (D320)", () => {
  const sent: Message[] = [];
  const mailer = async (message: Message) => {
    sent.push(message);
    return "sent" as const;
  };

  beforeEach(() => {
    sent.length = 0;
    minted.length = 0;
    tokenHash = "hashed";
    process.env.NEXT_PUBLIC_SITE_URL = "https://intgetion.com";
  });

  it("sends the reset letter to our own callback, in the person's language", async () => {
    const ok = await sendAuthMail(
      "reset",
      { email: "ana@example.com", locale: "ru" },
      mailer,
    );
    expect(ok).toBe(true);
    expect(minted).toEqual([
      { type: "recovery", email: "ana@example.com", password: undefined },
    ]);
    const [message] = sent;
    expect(message.subject).toBe("Новый пароль");
    expect(message.text).toContain(
      "https://intgetion.com/ru/auth/callback?token_hash=hashed&type=recovery&next=reset",
    );
    // The letter is the site's card, not a bare link.
    expect(message.html).toContain("<!DOCTYPE html>");
    expect(message.html).toContain("Задать новый пароль");
  });

  it("asks for the right kind of token for each letter", async () => {
    await sendAuthMail("signIn", { email: "a@b.c", locale: "en" }, mailer);
    await sendAuthMail(
      "confirm",
      { email: "a@b.c", locale: "en", password: "orbit-lantern-42" },
      mailer,
    );
    expect(minted.map((m) => m.type)).toEqual(["magiclink", "signup"]);
    expect(minted[1].password).toBe("orbit-lantern-42");
    expect(sent[0].text).toContain("type=magiclink");
    expect(sent[0].text).not.toContain("next=reset");
  });

  it("says no when the token cannot be minted, so the caller can fall back", async () => {
    tokenHash = null;
    expect(
      await sendAuthMail("reset", { email: "a@b.c", locale: "en" }, mailer),
    ).toBe(false);
    expect(sent).toEqual([]);
  });

  it("says no when the mail is not configured", async () => {
    expect(
      await sendAuthMail(
        "reset",
        { email: "a@b.c", locale: "en" },
        async () => "skipped",
      ),
    ).toBe(false);
  });
});
