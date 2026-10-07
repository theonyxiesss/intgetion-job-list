"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { Choice } from "@/components/ui/choice";
import type { AccountType } from "@/config/account";
import {
  accountTypeSchema,
  emailSchema,
  passwordSchema,
} from "@/modules/auth/schemas";
import {
  apiErrorCode,
  Field,
  FormAlert,
  SubmitButton,
  useAuthError,
} from "./fields";

// The password rule sits on the field, so its error shows together with the
// others instead of after they are fixed.
function schemaFor(magic: boolean) {
  return z.object({
    email: emailSchema,
    password: z
      .string()
      .optional()
      .superRefine((value, ctx) => {
        if (magic) return;
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

export function RegisterForm({ next }: { next?: "chat" }) {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const locale = useLocale();
  const router = useRouter();
  const [magic, setMagic] = useState(false);
  const magicRef = useRef(false);
  const [formError, setFormError] = useState<string>();

  const form = useForm<{
    email: string;
    password?: string;
    acceptTerms: boolean;
    accountType?: AccountType;
  }>({
    resolver: (values, context, options) => {
      const resolve = zodResolver(schemaFor(magicRef.current)) as Resolver<{
        email: string;
        password?: string;
        acceptTerms: boolean;
        accountType?: AccountType;
      }>;
      return resolve(values, context, options);
    },
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
        password: magic ? undefined : values.password,
        acceptTerms: values.acceptTerms,
        accountType: values.accountType,
        locale,
        next,
      }),
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

      <fieldset
        className="flex flex-col gap-2"
        aria-invalid={errors.accountType ? true : undefined}
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
      {!magic ? (
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
                  href={`/${locale}/terms`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {chunks}
                </a>
              ),
              privacy: (chunks) => (
                <a
                  href={`/${locale}/privacy`}
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
      <button
        type="button"
        className="min-h-11 self-start text-fg-muted underline underline-offset-4"
        onClick={() => {
          const next = !magicRef.current;
          magicRef.current = next;
          setMagic(next);
          form.clearErrors();
        }}
      >
        {magic ? t("usePassword") : t("useMagicLink")}
      </button>
    </form>
  );
}
