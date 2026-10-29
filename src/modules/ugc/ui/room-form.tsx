"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

/** A message in the order room. The server checks the party and the text. */
export function RoomForm({ inviteId }: { inviteId: string }) {
  const t = useTranslations("ugc");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    setBusy(true);
    setNote("");
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "roomPost", inviteId, body }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      const code = data?.error?.code;
      setNote(
        code === "CONTACTS_IN_TEXT"
          ? t("roomContacts")
          : code === "UGC_ROOM_NOT_READY"
            ? t("roomNotReady")
            : code === "UGC_ROOM_CLOSED"
              ? t("roomClosed")
              : t("error"),
      );
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit} aria-busy={busy}>
      <Field label={t("roomBodyLabel")}>
        <Textarea name="body" rows={3} maxLength={2000} required />
      </Field>
      <p className="t-body-s text-fg-muted">{t("roomContactsHint")}</p>
      {note ? (
        <p role="alert" className="t-body-s text-danger">
          {note}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="strong"
        disabled={busy}
        className="self-start"
      >
        {t("roomSend")}
      </Button>
    </form>
  );
}
