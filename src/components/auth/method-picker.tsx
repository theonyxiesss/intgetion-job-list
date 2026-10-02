"use client";

import { useTranslations } from "next-intl";

export type Method = "password" | "magic";

export function MethodPicker({
  method,
  onChange,
}: {
  method: Method;
  onChange: (method: Method) => void;
}) {
  const t = useTranslations("auth");
  return (
    <fieldset className="flex flex-wrap gap-4">
      <legend className="mb-2 font-medium">{t("methodLabel")}</legend>
      {(["password", "magic"] as const).map((value) => (
        <label key={value} className="inline-flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="method"
            value={value}
            checked={method === value}
            onChange={() => onChange(value)}
          />
          {value === "password" ? t("methodPassword") : t("methodMagicLink")}
        </label>
      ))}
    </fieldset>
  );
}
