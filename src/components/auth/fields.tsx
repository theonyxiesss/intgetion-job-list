"use client";

import { useTranslations } from "next-intl";
import type { InputHTMLAttributes, ReactNode } from "react";

/** Message for a zod or Supabase error code; unknown codes get the generic text. */
export function useAuthError() {
  const t = useTranslations("auth.errors");
  return (code: string | undefined) => {
    if (!code) return undefined;
    return t.has(code) ? t(code) : t("generic");
  };
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ id, label, hint, error, ...input }: FieldProps) {
  const described = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className="min-h-11 rounded-md border border-current/30 bg-transparent px-3"
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm opacity-80">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/40 px-3 py-2 text-danger"
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="min-h-11 rounded-md bg-foreground px-4 text-background disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Reads `error.code` from a JSON error body (section 6), if there is one. */
export async function apiErrorCode(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; details?: unknown };
    };
    const details = body.error?.details;
    if (body.error?.code === "VALIDATION_ERROR" && Array.isArray(details)) {
      const message = (details[0] as { message?: string } | undefined)?.message;
      if (message) return message;
    }
    if (body.error?.code === "UNAUTHENTICATED") {
      const reason = (details as { reason?: string } | undefined)?.reason;
      return reason ?? "invalid_credentials";
    }
    if (body.error?.code === "RATE_LIMITED") return "rate_limited";
    return "generic";
  } catch {
    return "generic";
  }
}
