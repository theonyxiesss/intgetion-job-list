"use client";

import { useTranslations } from "next-intl";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";

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
      <label htmlFor={id} className="t-label text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className={controlClass}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="t-body-s text-fg-muted">
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
      className="border border-danger px-3 py-2 break-words text-danger"
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
    <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
      {children}
    </Button>
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
    if (body.error?.code === "EMAIL_ALREADY_REGISTERED") {
      return "email_already_registered";
    }
    if (body.error?.code === "RATE_LIMITED") return "rate_limited";
    return "generic";
  } catch {
    return "generic";
  }
}
