"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { UGC_LIMITS } from "@/config/ugc";

/** Apply to a brief; the brief's own questions are answered first (U3б). */
export function ApplyForm({
  campaignId,
  questions,
}: {
  campaignId: string;
  questions: readonly string[];
}) {
  const t = useTranslations("ugc");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers = questions.map((_, index) =>
      String(form.get(`a${index}`) ?? ""),
    );
    setBusy(true);
    setNote("");
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "apply", campaignId, answers }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setNote(t("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit} aria-busy={busy}>
      {questions.map((question, index) => (
        <Field key={index} label={question}>
          <Textarea
            name={`a${index}`}
            rows={2}
            maxLength={UGC_LIMITS.answerMax}
            required
          />
        </Field>
      ))}
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
        {t("apply")}
      </Button>
    </form>
  );
}
