export const ADMIN_SESSION_COOKIE = "__Host-admin_session";

export const adminSessionCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 8 * 60 * 60,
};
