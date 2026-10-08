/** Pages a sign-in may return to (allowlist: no open redirect). */
export const RETURN_PATHS = {
  chat: "/chat",
  "post-job": "/post-job",
  billing: "/billing/crypto?plan=hire",
  "billing-team": "/billing/crypto?plan=team",
  "billing-plus": "/billing/crypto?plan=plus",
  "billing-pro": "/billing/crypto?plan=pro",
} as const;

export type LoginNext = keyof typeof RETURN_PATHS;

export function isLoginNext(value: string | undefined): value is LoginNext {
  return value !== undefined && Object.hasOwn(RETURN_PATHS, value);
}

/** Sign-in return key for a paid plan. Unknown codes stay off the allowlist. */
export function planLoginNext(code: string): LoginNext | null {
  if (code === "hire") return "billing";
  if (code === "team") return "billing-team";
  if (code === "plus") return "billing-plus";
  if (code === "pro") return "billing-pro";
  return null;
}
