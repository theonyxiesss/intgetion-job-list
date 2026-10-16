"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Hired creator sends one video link. The server rejects a second revision. */
export function UgcSubmit({ inviteId }: { inviteId: string }) {
  const t = useTranslations("ugc");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        inviteId,
        url: String(form.get("url") ?? ""),
        hook: String(form.get("hook") ?? ""),
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(t("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
      <Field label={t("fields.videoUrl")}>
        <Input name="url" type="url" required maxLength={500} />
      </Field>
      <Field label={t("fields.hook")}>
        <Input name="hook" required maxLength={300} />
      </Field>
      {error ? (
        <p className="t-body-s text-fg-muted" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {t("submitVideo")}
      </Button>
    </form>
  );
}

/** The hired creator states the live post and the views they saw. The server does not fetch it. */
export function UgcReport({ inviteId }: { inviteId: string }) {
  const t = useTranslations("ugc");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const views = Number(form.get("views"));
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "report",
        inviteId,
        liveUrl: String(form.get("liveUrl") ?? ""),
        views,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(t("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
      <Field label={t("fields.liveUrl")}>
        <Input name="liveUrl" type="url" required maxLength={500} />
      </Field>
      <Field label={t("fields.views")}>
        <Input
          name="views"
          type="number"
          required
          min={0}
          max={2000000000}
          step={1}
          inputMode="numeric"
        />
      </Field>
      {error ? (
        <p className="t-body-s text-fg-muted" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {t("reportLive")}
      </Button>
    </form>
  );
}

/** The company asks for the one allowed revision. */
export function UgcChanges({ inviteId }: { inviteId: string }) {
  const t = useTranslations("ugc");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "changes",
        inviteId,
        note: String(form.get("note") ?? ""),
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(t("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <form className="mt-3 flex max-w-xl flex-col gap-4" onSubmit={onSubmit}>
      <Field label={t("fields.changeNote")}>
        <Input name="note" required maxLength={500} />
      </Field>
      {error ? (
        <p className="t-body-s text-fg-muted" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        disabled={busy}
        aria-busy={busy}
      >
        {t("requestChanges")}
      </Button>
    </form>
  );
}
