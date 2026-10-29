"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

/**
 * The texts of an open or paused brief (D512): reward, rights, the number
 * of videos and the deadline are not here, hired creators agreed to them.
 */
export function BriefTextForm({
  campaignId,
  initial,
}: {
  campaignId: string;
  initial: {
    productSummary: string;
    pitch: string;
    mustSay: string;
    mustNot: string;
    exampleUrls: readonly string[];
    questions: readonly string[];
  };
}) {
  const t = useTranslations("ugc");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (name: string) => String(form.get(name) ?? "");
    setBusy(true);
    setNote(null);
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "editText",
        campaignId,
        productSummary: read("productSummary"),
        pitch: read("pitch"),
        mustSay: read("mustSay"),
        mustNot: read("mustNot"),
        exampleUrls: read("exampleUrls").split(/\s+/).filter(Boolean),
        questions: read("questions")
          .split("\n")
          .map((row) => row.trim())
          .filter(Boolean),
      }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setNote({ ok: false, text: t("error") });
      return;
    }
    setNote({ ok: true, text: t("editTextSaved") });
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} aria-busy={busy}>
      <p className="t-body-s text-fg-muted">{t("editTextHint")}</p>
      <Field label={t("fields.productSummary")}>
        <Textarea
          name="productSummary"
          defaultValue={initial.productSummary}
          maxLength={400}
          rows={3}
          required
        />
      </Field>
      <Field label={t("fields.pitch")}>
        <Textarea name="pitch" defaultValue={initial.pitch} rows={3} />
      </Field>
      <Field label={t("fields.mustSay")}>
        <Textarea
          name="mustSay"
          defaultValue={initial.mustSay}
          maxLength={1000}
          rows={2}
          required
        />
      </Field>
      <Field label={t("fields.mustNot")}>
        <Textarea
          name="mustNot"
          defaultValue={initial.mustNot}
          maxLength={1000}
          rows={2}
          required
        />
      </Field>
      <Field label={t("fields.examples")}>
        <Input
          name="exampleUrls"
          defaultValue={initial.exampleUrls.join(" ")}
        />
      </Field>
      <Field label={t("fields.questions")}>
        <Textarea
          name="questions"
          defaultValue={initial.questions.join("\n")}
          rows={3}
        />
      </Field>
      <p className="t-body-s text-fg-muted">{t("fields.questionsHint")}</p>
      {note ? (
        <p
          role={note.ok ? "status" : "alert"}
          className={note.ok ? "t-body-s" : "t-body-s text-danger"}
        >
          {note.text}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        disabled={busy}
        className="self-start"
      >
        {t("editTextSave")}
      </Button>
    </form>
  );
}
