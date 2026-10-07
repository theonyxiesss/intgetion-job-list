"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { Choice } from "@/components/ui/choice";
import {
  accountTypeSchema,
  emailSchema,
  passwordSchema,
} from "@/modules/auth/schemas";
import { MethodPicker, type Method } from "./method-picker";
import {
  apiErrorCode,
  Field,
  FormAlert,
  SubmitButton,
  useAuthError,
} from "./fields";
import { localePrefix } from "@/i18n/paths";

// The password rule sits on the field, so its error shows together with the
// others instead of after they are fixed.
function schemaFor(method: Method) {
  return z.object({
    email: emailSchema,
    password: z
      .string()
      .optional()
      .superRefine((value, ctx) => {
        if (method !== "password") return;
        const result = passwordSchema.safeParse(value ?? "");
        if (!result.success) {
          ctx.addIssue({
            code: "custom",
            message: result.error.issues[0]?.message,
          });
        }
      }),
    acceptTerms: z.literal(true, { error: "terms_required" }),
    accountType: accountTypeSchema,
  });
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const locale = useLocale();
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [formError, setFormError] = useState<string>();

  const form = useForm({
    resolver: zodResolver(schemaFor(method)),
    defaultValues: { email: "", password: "" },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        password: method === "password" ? values.password : undefined,
        acceptTerms: values.acceptTerms,
        accountType: values.accountType,
        locale,
      }),
    });
    if (!response.ok) {
      setFormError(await apiErrorCode(response));
      return;
    }
    const body = (await response.json().catch(() => null)) as {
      status?: string;
    } | null;
    router.push(
      body?.status === "resent"
        ? "/auth/check-email?resent=1"
        : "/auth/check-email",
    );
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <MethodPicker
        method={method}
        onChange={(value) => {
          setMethod(value);
          form.clearErrors();
        }}
      />
      <FormAlert>{errorText(formError)}</FormAlert>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.accountType ? "account-type-error" : undefined}
      >
        <legend className="t-label mb-1 text-fg-muted">
          {t("accountTypeLabel")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["candidate", "employer"] as const).map((type) => (
            <Choice
              key={type}
              type="radio"
              value={type}
              label={t(`accountType.${type}`)}
              hint={t(`accountType.${type}Hint`)}
              className="border border-line px-3 py-2 has-[:checked]:border-accent"
              {...form.register("accountType")}
            />
          ))}
        </div>
        {errors.accountType && (
          <p id="account-type-error" className="text-sm text-danger">
            {errorText(errors.accountType.message)}
          </p>
        )}
      </fieldset>

      <Field
        id="register-email"
        type="email"
        autoComplete="email"
        label={t("email")}
        error={errorText(errors.email?.message)}
        {...form.register("email")}
      />
      {method === "password" ? (
        <Field
          id="register-password"
          type="password"
          autoComplete="new-password"
          label={t("password")}
          hint={t("passwordHint")}
          error={errorText(errors.password?.message)}
          {...form.register("password")}
        />
      ) : (
        <p className="text-sm opacity-80">{t("magicLinkHint")}</p>
      )}
      <div className="flex flex-col gap-1">
        <label className="inline-flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
            {...form.register("acceptTerms")}
          />
          <span>
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <a
                  href={`${localePrefix(locale)}/terms`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {chunks}
                </a>
              ),
              privacy: (chunks) => (
                <a
                  href={`${localePrefix(locale)}/privacy`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="terms-error" className="text-sm text-danger">
            {errorText(errors.acceptTerms.message)}
          </p>
        )}
      </div>
      <SubmitButton pending={form.formState.isSubmitting}>
        {t("submitRegister")}
      </SubmitButton>
    </form>
  );
}
