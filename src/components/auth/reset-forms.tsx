"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { emailSchema, passwordSchema } from "@/modules/auth/schemas";
import {
  apiErrorCode,
  Field,
  FormAlert,
  SubmitButton,
  useAuthError,
} from "./fields";

const requestSchema = z.object({ email: emailSchema });
const updateSchema = z.object({ password: passwordSchema });

export function RequestResetForm() {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const locale = useLocale();
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const form = useForm({ resolver: zodResolver(requestSchema) });

  const submit = form.handleSubmit(async ({ email }) => {
    setFormError(undefined);
    const response = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });
    if (!response.ok) {
      setFormError(await apiErrorCode(response));
      return;
    }
    router.push("/auth/check-email");
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert>{errorText(formError)}</FormAlert>
      <Field
        id="reset-email"
        type="email"
        autoComplete="email"
        label={t("email")}
        hint={t("resetHint")}
        error={errorText(form.formState.errors.email?.message)}
        {...form.register("email")}
      />
      <SubmitButton pending={form.formState.isSubmitting}>
        {t("submitReset")}
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const form = useForm({ resolver: zodResolver(updateSchema) });

  const submit = form.handleSubmit(async ({ password }) => {
    setFormError(undefined);
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.status === 401) {
      setFormError("session_missing");
      return;
    }
    if (!response.ok) {
      setFormError(await apiErrorCode(response));
      return;
    }
    router.replace("/");
    router.refresh();
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert>{errorText(formError)}</FormAlert>
      <Field
        id="new-password"
        type="password"
        autoComplete="new-password"
        label={t("newPassword")}
        hint={t("passwordHint")}
        error={errorText(form.formState.errors.password?.message)}
        {...form.register("password")}
      />
      <SubmitButton pending={form.formState.isSubmitting}>
        {t("submitNewPassword")}
      </SubmitButton>
    </form>
  );
}
