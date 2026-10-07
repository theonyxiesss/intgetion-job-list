import { beforeEach, describe, expect, it, vi } from "vitest";
import { TERMS_VERSION } from "@/config/legal";
import { HttpError } from "@/lib/http";
import * as audit from "@/lib/audit";
import * as authAdmin from "@/lib/supabase/admin";
import * as usersRepo from "../repo/users";
import {
  auditSignIn,
  changePassword,
  completeCallback,
  getCurrentUser,
  startGoogleSignIn,
  startXSignIn,
  register,
  requestPasswordReset,
  requireCurrentUser,
  sendMagicLink,
  signIn,
  type AuthClient,
  type CurrentUser,
} from "../service/auth-service";

vi.mock("../repo/users", () => ({
  findUserByAuthUid: vi.fn(),
  insertUserIfMissing: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

vi.mock("@/lib/supabase/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof authAdmin>();
  return {
    ...actual,
    findAuthUserByEmail: vi.fn(),
  };
});

const findAuthUserByEmail = vi.mocked(authAdmin.findAuthUserByEmail);

const repo = vi.mocked(usersRepo);
const recordAudit = vi.mocked(audit.recordAudit);

const row: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  authUid: "22222222-2222-4222-8222-222222222222",
  platformRole: "user",
  accountType: "candidate",
  status: "active",
  locale: "en",
  termsAcceptedAt: new Date("2026-10-03T00:00:00Z"),
  termsVersion: TERMS_VERSION,
  marketingOptIn: false,
  lastActiveAt: null,
  createdAt: new Date("2026-10-03T00:00:00Z"),
  updatedAt: new Date("2026-10-03T00:00:00Z"),
  deletedAt: null,
};

type AuthUser = {
  id: string;
  email_confirmed_at?: string;
  user_metadata: Record<string, unknown>;
};

function fakeAuth(user: AuthUser | null) {
  const ok = { data: { user: null }, error: null };
  return {
    signUp: vi.fn().mockResolvedValue(ok),
    signInWithOtp: vi.fn().mockResolvedValue(ok),
    resend: vi.fn().mockResolvedValue(ok),
    resetPasswordForEmail: vi.fn().mockResolvedValue(ok),
    exchangeCodeForSession: vi.fn().mockResolvedValue(ok),
    verifyOtp: vi.fn().mockResolvedValue(ok),
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue(ok),
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { user }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/o/oauth2" },
      error: null,
    }),
  };
}

function asAuth(fake: ReturnType<typeof fakeAuth>) {
  return fake as unknown as AuthClient;
}

const confirmed: AuthUser = {
  id: row.authUid,
  email_confirmed_at: "2026-10-03T00:00:00Z",
  user_metadata: {
    terms_version: TERMS_VERSION,
    terms_accepted_at: "2026-10-03T10:00:00.000Z",
    locale: "ru",
  },
};
const unconfirmed: AuthUser = { ...confirmed, email_confirmed_at: undefined };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000/";
});

describe("register", () => {
  const now = new Date("2026-10-03T10:00:00.000Z");

  it("signs up with a password and stores terms in metadata", async () => {
    const auth = fakeAuth(null);
    auth.signUp.mockResolvedValue({
      data: { user: { id: "new", identities: [{ id: "i1" }] } },
      error: null,
    });
    await expect(
      register(
        asAuth(auth),
        {
          email: "ana@example.com",
          password: "orbit-lantern-42",
          locale: "ru",
          acceptTerms: true,
          accountType: "candidate",
        },
        now,
      ),
    ).resolves.toEqual({ status: "created" });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "orbit-lantern-42",
      options: {
        emailRedirectTo: "http://127.0.0.1:3000/ru/auth/callback",
        data: {
          terms_version: TERMS_VERSION,
          terms_accepted_at: "2026-10-03T10:00:00.000Z",
          locale: "ru",
          account_type: "candidate",
        },
      },
    });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends the person back to the chat when they registered from Spoki", async () => {
    const auth = fakeAuth(null);
    await register(
      asAuth(auth),
      {
        email: "ana@example.com",
        password: "orbit-lantern-42",
        locale: "en",
        acceptTerms: true, accountType: "candidate" as const,
        next: "chat",
      },
      now,
    );
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "http://127.0.0.1:3000/en/auth/callback?next=chat",
        }),
      }),
    );
  });

  it("sends a magic link that may create the user when there is no password", async () => {
    const auth = fakeAuth(null);
    await expect(
      register(
        asAuth(auth),
        {
          email: "ana@example.com",
          locale: "en",
          acceptTerms: true,
          accountType: "candidate",
        },
        now,
      ),
    ).resolves.toEqual({ status: "created" });
    expect(auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@example.com",
        options: expect.objectContaining({ shouldCreateUser: true }),
      }),
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("resends confirmation when the address is still unconfirmed (D327)", async () => {
    const auth = fakeAuth(null);
    auth.signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [] } },
      error: null,
    });
    findAuthUserByEmail.mockResolvedValue({ id: "u1", confirmed: false });
    await expect(
      register(asAuth(auth), {
        email: "ana@example.com",
        password: "orbit-lantern-42",
        locale: "en",
        acceptTerms: true,
        accountType: "candidate",
      }),
    ).resolves.toEqual({ status: "resent" });
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ana@example.com",
      options: {
        emailRedirectTo: "http://127.0.0.1:3000/en/auth/callback",
      },
    });
  });

  it("shows already-registered when resend fails after a duplicate (D327)", async () => {
    const auth = fakeAuth(null);
    auth.signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [] } },
      error: null,
    });
    findAuthUserByEmail.mockResolvedValue({ id: "u1", confirmed: false });
    auth.resend.mockResolvedValue({
      data: {},
      error: { code: "unexpected_failure", status: 500 },
    });
    await expect(
      register(asAuth(auth), {
        email: "ana@example.com",
        password: "orbit-lantern-42",
        locale: "en",
        acceptTerms: true, accountType: "candidate" as const,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });

  it("refuses a confirmed address with EMAIL_ALREADY_REGISTERED (D327)", async () => {
    const auth = fakeAuth(null);
    auth.signUp.mockResolvedValue({
      data: {},
      error: { code: "user_already_exists", status: 422 },
    });
    findAuthUserByEmail.mockResolvedValue({ id: "u1", confirmed: true });
    await expect(
      register(asAuth(auth), {
        email: "ana@example.com",
        password: "orbit-lantern-42",
        locale: "en",
        acceptTerms: true,
        accountType: "candidate",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_ALREADY_REGISTERED",
    });
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("maps provider rate limits to 429 RATE_LIMITED", async () => {
    const auth = fakeAuth(null);
    auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    await expect(
      register(asAuth(auth), {
        email: "ana@example.com",
        locale: "en",
        acceptTerms: true, accountType: "candidate" as const,
      }),
    ).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });
});

describe("requestPasswordReset", () => {
  it("never reveals whether the address exists", async () => {
    const auth = fakeAuth(null);
    auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { code: "user_not_found", status: 400 },
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      requestPasswordReset(asAuth(auth), {
        email: "nobody@example.com",
        locale: "en",
      }),
    ).resolves.toBeUndefined();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "nobody@example.com",
      { redirectTo: "http://127.0.0.1:3000/en/auth/callback?next=reset" },
    );
  });
});

describe("completeCallback", () => {
  it("creates the users row from signup metadata after a PKCE exchange", async () => {
    const auth = fakeAuth(confirmed);
    repo.findUserByAuthUid.mockResolvedValue(undefined);
    repo.insertUserIfMissing.mockResolvedValue(row);

    const result = await completeCallback(asAuth(auth), { code: "abc" });

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(repo.insertUserIfMissing).toHaveBeenCalledWith(row.authUid, {
      terms_version: TERMS_VERSION,
      terms_accepted_at: "2026-10-03T10:00:00.000Z",
      locale: "ru",
    });
    expect(result).toEqual({ ok: true, user: row, created: true });
  });

  it("verifies token_hash links", async () => {
    const auth = fakeAuth(confirmed);
    repo.findUserByAuthUid.mockResolvedValue(row);
    const result = await completeCallback(asAuth(auth), {
      tokenHash: "hash",
      type: "magiclink",
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "hash",
      type: "magiclink",
    });
    expect(result.ok).toBe(true);
    expect(repo.insertUserIfMissing).not.toHaveBeenCalled();
  });

  it("rejects links without a code or with an unknown type", async () => {
    const auth = fakeAuth(confirmed);
    expect(await completeCallback(asAuth(auth), {})).toEqual({
      ok: false,
      reason: "invalid_link",
    });
    expect(
      await completeCallback(asAuth(auth), { tokenHash: "h", type: "sms" }),
    ).toEqual({ ok: false, reason: "invalid_link" });
  });

  it("rejects an expired code", async () => {
    const auth = fakeAuth(confirmed);
    auth.exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { code: "flow_state_expired", status: 400 },
    });
    expect(await completeCallback(asAuth(auth), { code: "old" })).toEqual({
      ok: false,
      reason: "invalid_link",
    });
    expect(repo.insertUserIfMissing).not.toHaveBeenCalled();
  });

  it("does not create a row for an unconfirmed email", async () => {
    const auth = fakeAuth(unconfirmed);
    const result = await completeCallback(asAuth(auth), { code: "abc" });
    expect(result).toEqual({ ok: false, reason: "invalid_link" });
    expect(repo.insertUserIfMissing).not.toHaveBeenCalled();
  });

  it("signs out and refuses when the terms were never accepted", async () => {
    const auth = fakeAuth({ ...confirmed, user_metadata: {} });
    repo.findUserByAuthUid.mockResolvedValue(undefined);
    const result = await completeCallback(asAuth(auth), { code: "abc" });
    expect(result).toEqual({ ok: false, reason: "missing_terms" });
    expect(auth.signOut).toHaveBeenCalled();
    expect(repo.insertUserIfMissing).not.toHaveBeenCalled();
  });

  it("creates a row from the Google terms when the provider sent none", async () => {
    const auth = fakeAuth({ ...confirmed, user_metadata: { iss: "https://accounts.google.com" } });
    repo.findUserByAuthUid.mockResolvedValue(undefined);
    repo.insertUserIfMissing.mockResolvedValue(row);
    const result = await completeCallback(
      asAuth(auth),
      { code: "abc" },
      {
        terms_version: TERMS_VERSION,
        terms_accepted_at: "2026-10-03T10:00:00.000Z",
        locale: "en",
        account_type: "candidate",
      },
    );
    expect(result).toEqual({ ok: true, user: row, created: true });
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});

describe("startGoogleSignIn", () => {
  it("asks Supabase for a Google redirect back to this site", async () => {
    const auth = fakeAuth(null);
    const started = await startGoogleSignIn(asAuth(auth), {
      locale: "ru",
      next: "chat",
    });
    expect(started.url).toBe("https://accounts.google.com/o/oauth2");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://127.0.0.1:3000/ru/auth/callback?next=chat",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
  });
});

describe("startXSignIn", () => {
  it("asks Supabase for an X redirect back to this site", async () => {
    const auth = fakeAuth(null);
    const started = await startXSignIn(asAuth(auth), {
      locale: "ru",
      next: "chat",
    });
    expect(started.url).toBe("https://accounts.google.com/o/oauth2");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "x",
      options: {
        redirectTo: "http://127.0.0.1:3000/ru/auth/callback?next=chat",
        skipBrowserRedirect: true,
      },
    });
  });
});

describe("current user", () => {
  it("returns the active row for a confirmed session", async () => {
    repo.findUserByAuthUid.mockResolvedValue(row);
    expect(await getCurrentUser(asAuth(fakeAuth(confirmed)))).toEqual(row);
  });

  it("treats an unconfirmed email as no session", async () => {
    repo.findUserByAuthUid.mockResolvedValue(row);
    expect(await getCurrentUser(asAuth(fakeAuth(unconfirmed)))).toBeNull();
    expect(repo.findUserByAuthUid).not.toHaveBeenCalled();
  });

  it("treats suspended and missing rows as no session", async () => {
    repo.findUserByAuthUid.mockResolvedValue({ ...row, status: "suspended" });
    expect(await getCurrentUser(asAuth(fakeAuth(confirmed)))).toBeNull();
    repo.findUserByAuthUid.mockResolvedValue(undefined);
    expect(await getCurrentUser(asAuth(fakeAuth(confirmed)))).toBeNull();
  });

  it("requireCurrentUser answers 401 UNAUTHENTICATED", async () => {
    const error = await requireCurrentUser(asAuth(fakeAuth(null))).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });
});

describe("writes need a confirmed email", () => {
  it("changePassword refuses an unconfirmed session before touching auth", async () => {
    const auth = fakeAuth(unconfirmed);
    await expect(
      changePassword(asAuth(auth), { password: "orbit-lantern-42" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("changePassword updates the password for a confirmed user", async () => {
    const auth = fakeAuth(confirmed);
    repo.findUserByAuthUid.mockResolvedValue(row);
    await changePassword(asAuth(auth), { password: "orbit-lantern-42" });
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "orbit-lantern-42",
    });
  });
});

describe("signIn (server password login, D38)", () => {
  const input = { email: "ana@example.com", password: "orbit-lantern-42" };

  it("returns the active row for good credentials", async () => {
    const auth = fakeAuth(confirmed);
    repo.findUserByAuthUid.mockResolvedValue(row);
    await expect(signIn(asAuth(auth), input)).resolves.toEqual(row);
    expect(auth.signInWithPassword).toHaveBeenCalledWith(input);
  });

  it("answers 401 with a reason the form can show", async () => {
    const auth = fakeAuth(null);
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "email_not_confirmed", status: 400 },
    });
    await expect(signIn(asAuth(auth), input)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      details: { reason: "email_not_confirmed" },
    });
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "invalid_credentials", status: 400 },
    });
    await expect(signIn(asAuth(auth), input)).rejects.toMatchObject({
      details: { reason: "invalid_credentials" },
    });
  });

  it("signs a suspended account straight back out", async () => {
    const auth = fakeAuth(confirmed);
    repo.findUserByAuthUid.mockResolvedValue({ ...row, status: "suspended" });
    await expect(signIn(asAuth(auth), input)).rejects.toMatchObject({
      status: 401,
    });
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe("sendMagicLink", () => {
  it("never creates a user from the sign-in page", async () => {
    const auth = fakeAuth(null);
    await sendMagicLink(asAuth(auth), {
      email: "ana@example.com",
      locale: "ru",
    });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "ana@example.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://127.0.0.1:3000/ru/auth/callback",
      },
    });
  });

  it("hides unknown addresses but passes on provider rate limits", async () => {
    const auth = fakeAuth(null);
    auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: { code: "otp_disabled", status: 422 },
    });
    await expect(
      sendMagicLink(asAuth(auth), { email: "x@example.com", locale: "en" }),
    ).resolves.toBeUndefined();
    auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    await expect(
      sendMagicLink(asAuth(auth), { email: "x@example.com", locale: "en" }),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe("auditSignIn (16.1)", () => {
  it("records admin sign-ins with the method and IP", async () => {
    await auditSignIn(
      { ...row, platformRole: "admin" },
      "password",
      "203.0.113.7",
    );
    expect(recordAudit).toHaveBeenCalledWith({
      actorId: row.id,
      action: "auth.admin_sign_in",
      entityType: "user",
      entityId: row.id,
      diff: { method: "password" },
      ip: "203.0.113.7",
    });
  });

  it("does not record regular users", async () => {
    await auditSignIn(row, "email_link", "203.0.113.7");
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
