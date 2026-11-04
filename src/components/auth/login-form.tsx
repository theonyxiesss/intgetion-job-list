"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { RETURN_PATHS, type LoginNext } from "./login-next";
import { emailSchema } from "@/modules/auth/schemas";
import { authFailureOf, postJson, type AuthFailure } from "./auth-failure";
import { Field, FormAlert, SubmitButton, useAuthError } from "./fields";

const passwordLogin = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "invalid_credentials" }),
});
const magicLogin = z.object({ email: emailSchema });

export function LoginForm({
  initialError,
  initialRequestId,
  next,
}: {
  initialError?: string;
  /** `ref` from an OAuth redirect when Auth was down (D606). */
  initialRequestId?: string;
  next?: LoginNext;
}) {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const locale = useLocale();
  const router = useRouter();
  const [magic, setMagic] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | undefined>(
    initialError
      ? { code: initialError, requestId: initialRequestId }
      : undefined,
  );

  const passwordForm = useForm({ resolver: zodResolver(passwordLogin) });
  const magicForm = useForm({ resolver: zodResolver(magicLogin) });

  // Input stays in the fields on every failure, so a retry is one click.
  const signInWithPassword = passwordForm.handleSubmit(async (values) => {
    setFailure(undefined);
    const response = await postJson("/api/auth/login", values);
    if (!response?.ok) {
      setFailure(await authFailureOf(response));
      return;
    }
    router.replace(next ? RETURN_PATHS[next] : "/");
    router.refresh();
  });

  const sendMagicLink = magicForm.handleSubmit(async ({ email }) => {
    setFailure(undefined);
    const response = await postJson("/api/auth/magic-link", {
      email,
      locale,
      next,
    });
    if (!response?.ok) {
      setFailure(await authFailureOf(response));
      return;
    }
    router.push("/auth/check-email");
  });

  return (
    <div className="flex flex-col gap-4">
      <FormAlert requestId={failure?.requestId}>
        {errorText(failure?.code)}
      </FormAlert>

      {!magic ? (
        <form
          onSubmit={signInWithPassword}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field
            id="login-email"
            type="email"
            autoComplete="email"
            label={t("email")}
            error={errorText(passwordForm.formState.errors.email?.message)}
            {...passwordForm.register("email")}
          />
          <Field
            id="login-password"
            type="password"
            autoComplete="current-password"
            label={t("password")}
            error={errorText(passwordForm.formState.errors.password?.message)}
            {...passwordForm.register("password")}
          />
          <SubmitButton pending={passwordForm.formState.isSubmitting}>
            {t("submitLogin")}
          </SubmitButton>
        </form>
      ) : (
        <form
          onSubmit={sendMagicLink}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field
            id="magic-email"
            type="email"
            autoComplete="email"
            label={t("email")}
            hint={t("magicLinkHint")}
            error={errorText(magicForm.formState.errors.email?.message)}
            {...magicForm.register("email")}
          />
          <SubmitButton pending={magicForm.formState.isSubmitting}>
            {t("submitMagicLink")}
          </SubmitButton>
        </form>
      )}
      <button
        type="button"
        className="min-h-11 self-start text-fg-muted underline underline-offset-4"
        onClick={() => {
          setMagic((value) => !value);
          setFailure(undefined);
        }}
      >
        {magic ? t("usePassword") : t("useMagicLink")}
      </button>
    </div>
  );
}
