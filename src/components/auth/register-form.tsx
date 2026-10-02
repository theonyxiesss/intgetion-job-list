"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { emailSchema, passwordSchema } from "@/modules/auth/schemas";
import { MethodPicker, type Method } from "./method-picker";
import {
  apiErrorCode,
  Field,
  FormAlert,
  SubmitButton,
  useAuthError,
} from "./fields";

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
        locale,
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
      <MethodPicker
        method={method}
        onChange={(value) => {
          setMethod(value);
          form.clearErrors();
        }}
      />
      <FormAlert>{errorText(formError)}</FormAlert>

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
          {t("acceptTerms")}
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
