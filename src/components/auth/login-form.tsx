"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { emailSchema } from "@/modules/auth/schemas";
import {
  apiErrorCode,
  Field,
  FormAlert,
  SubmitButton,
  useAuthError,
} from "./fields";

const passwordLogin = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "invalid_credentials" }),
});
const magicLogin = z.object({ email: emailSchema });

export function LoginForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: "chat";
}) {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const locale = useLocale();
  const router = useRouter();
  const [magic, setMagic] = useState(false);
  const [formError, setFormError] = useState(initialError);

  const passwordForm = useForm({ resolver: zodResolver(passwordLogin) });
  const magicForm = useForm({ resolver: zodResolver(magicLogin) });

  async function post(path: string, body: unknown) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const signInWithPassword = passwordForm.handleSubmit(async (values) => {
    setFormError(undefined);
    const response = await post("/api/auth/login", values);
    if (!response.ok) {
      setFormError(await apiErrorCode(response));
      return;
    }
    router.replace(next === "chat" ? "/chat" : "/");
    router.refresh();
  });

  const sendMagicLink = magicForm.handleSubmit(async ({ email }) => {
    setFormError(undefined);
    const response = await post("/api/auth/magic-link", {
      email,
      locale,
      next,
    });
    if (!response.ok) {
      setFormError(await apiErrorCode(response));
      return;
    }
    router.push("/auth/check-email");
  });

  return (
    <div className="flex flex-col gap-4">
      <FormAlert>{errorText(formError)}</FormAlert>

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
          setFormError(undefined);
        }}
      >
        {magic ? t("usePassword") : t("useMagicLink")}
      </button>
    </div>
  );
}
