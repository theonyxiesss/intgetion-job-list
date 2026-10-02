"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { emailSchema } from "@/modules/auth/schemas";
import { MethodPicker, type Method } from "./method-picker";
import { Field, FormAlert, SubmitButton, useAuthError } from "./fields";

const passwordLogin = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "invalid_credentials" }),
});
const magicLogin = z.object({ email: emailSchema });

export function LoginForm({ initialError }: { initialError?: string }) {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const locale = useLocale();
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [formError, setFormError] = useState(initialError);

  const passwordForm = useForm({ resolver: zodResolver(passwordLogin) });
  const magicForm = useForm({ resolver: zodResolver(magicLogin) });

  const signInWithPassword = passwordForm.handleSubmit(async (values) => {
    setFormError(undefined);
    const { error } =
      await createSupabaseBrowserClient().auth.signInWithPassword(values);
    if (error) {
      setFormError(
        error.status === 429
          ? "rate_limited"
          : error.code === "email_not_confirmed"
            ? "email_not_confirmed"
            : "invalid_credentials",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  });

  const sendMagicLink = magicForm.handleSubmit(async ({ email }) => {
    setFormError(undefined);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/callback`,
      },
    });
    // Unknown addresses get the same screen (anti-enumeration).
    if (error?.status === 429) {
      setFormError("rate_limited");
      return;
    }
    router.push("/auth/check-email");
  });

  return (
    <div className="flex flex-col gap-4">
      <MethodPicker method={method} onChange={setMethod} />
      <FormAlert>{errorText(formError)}</FormAlert>

      {method === "password" ? (
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
    </div>
  );
}
