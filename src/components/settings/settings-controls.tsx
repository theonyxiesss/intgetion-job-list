"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmCard } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";

async function send(path: string, method: string, body: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return Boolean(response?.ok);
}

/** One labelled on/off setting with a description (DESIGN.md 9.9). */
function SettingRow({
  title,
  text,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line py-5">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="t-body-s text-fg-muted">{text}</p>
      </div>
      <Switch
        label={title}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

export function ProfileVisibility({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const toast = useToast();
  const [value, setValue] = useState(hidden);
  const [busy, setBusy] = useState(false);
  async function change(next: boolean) {
    setBusy(true);
    const ok = await send("/api/candidates/me/visibility", "PUT", {
      hidden: next,
    });
    setBusy(false);
    if (!ok) return toast.show(t("failed"), "danger");
    setValue(next);
    toast.show(t("saved"));
  }
  return (
    <SettingRow
      title={t("hideProfile")}
      text={t("hideProfileText")}
      checked={value}
      disabled={busy}
      onChange={change}
    />
  );
}

export function MarketingOptIn({ enabled }: { enabled: boolean }) {
  const t = useTranslations("settings");
  const toast = useToast();
  const [value, setValue] = useState(enabled);
  const [busy, setBusy] = useState(false);
  async function change(next: boolean) {
    setBusy(true);
    const ok = await send("/api/me", "PATCH", { marketingOptIn: next });
    setBusy(false);
    if (!ok) return toast.show(t("failed"), "danger");
    setValue(next);
    toast.show(t("saved"));
  }
  return (
    <SettingRow
      title={t("marketing")}
      text={t("marketingText")}
      checked={value}
      disabled={busy}
      onChange={change}
    />
  );
}

export function EmailLanguage({ locale }: { locale: string }) {
  const t = useTranslations("settings");
  const names = useTranslations("locale");
  const toast = useToast();
  const [value, setValue] = useState(locale);
  async function change(next: string) {
    setValue(next);
    const ok = await send("/api/me", "PATCH", { locale: next });
    toast.show(ok ? t("saved") : t("failed"), ok ? "info" : "danger");
  }
  return (
    <Field label={t("emailLanguage")} help={t("emailLanguageText")}>
      <Select
        value={value}
        onChange={(event) => change(event.target.value)}
        className="max-w-60"
      >
        <option value="en">{names("en")}</option>
        <option value="ru">{names("ru")}</option>
      </Select>
    </Field>
  );
}

/** D331: switch between looking for work and hiring; permissions do not change. */
export function AccountTypeSetting({
  value,
}: {
  value: "candidate" | "employer";
}) {
  const t = useTranslations("settings");
  const auth = useTranslations("auth.accountType");
  const toast = useToast();
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  async function change(next: "candidate" | "employer") {
    setCurrent(next);
    const ok = await send("/api/me", "PATCH", { accountType: next });
    toast.show(ok ? t("saved") : t("failed"), ok ? "info" : "danger");
    if (ok) router.refresh();
  }
  return (
    <Field label={auth("settingsLabel")}>
      <Select
        value={current}
        onChange={(event) =>
          change(event.target.value as "candidate" | "employer")
        }
        className="max-w-60"
      >
        <option value="candidate">{auth("candidate")}</option>
        <option value="employer">{auth("employer")}</option>
      </Select>
    </Field>
  );
}

/**
 * Account deletion (D28): the user types DELETE, then confirms in a card.
 * After success the session is gone and the browser goes home.
 */
export function DeleteAccount() {
  const t = useTranslations("settings");
  const toast = useToast();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const ok = await send("/api/me", "DELETE", { confirm: "DELETE" });
    setBusy(false);
    if (!ok) {
      toast.show(t("deleteFailed"), "danger");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <section
      aria-labelledby="delete-title"
      className="flex flex-col gap-4 border border-danger p-6"
    >
      <h2 id="delete-title" className="t-h3 text-danger">
        {t("deleteTitle")}
      </h2>
      <p className="t-body-s max-w-[60ch] text-fg-muted">{t("deleteText")}</p>
      {confirming ? (
        <ConfirmCard
          title={t("deleteConfirmTitle")}
          confirmLabel={t("deleteConfirm")}
          cancelLabel={t("cancel")}
          danger
          loading={busy}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        >
          {t("deleteConfirmText")}
        </ConfirmCard>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={t("deleteType")}>
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="t-data sm:w-48"
            />
          </Field>
          <Button
            variant="danger"
            disabled={typed !== "DELETE"}
            icon={<Icon icon={Trash2} size={16} />}
            onClick={() => setConfirming(true)}
          >
            {t("deleteButton")}
          </Button>
        </div>
      )}
    </section>
  );
}
