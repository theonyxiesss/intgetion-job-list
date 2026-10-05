"use client";

import { useState } from "react";
import { Choice } from "@/components/ui/choice";
import {
  CONSENT_CATEGORIES,
  NECESSARY_ONLY,
  writeConsent,
  type Consent,
  type ConsentCategory,
} from "@/lib/consent";

export interface CookieChoiceText {
  title: string;
  text: string;
  necessary: string;
  necessaryHint: string;
  preferences: string;
  preferencesHint: string;
  analytics: string;
  analyticsHint: string;
  saved: string;
}

/**
 * Change the cookie choice made in the banner (D201, D219): withdrawing
 * consent must be as easy as giving it. Each switch applies at once and a
 * withdrawn category deletes its cookies.
 */
export function CookieChoice({
  initial,
  text,
}: {
  initial: Consent | null;
  text: CookieChoiceText;
}) {
  const [value, setValue] = useState<Consent>(initial ?? NECESSARY_ONLY);
  const [saved, setSaved] = useState(false);

  function toggle(category: ConsentCategory, allowed: boolean) {
    const next = { ...value, [category]: allowed };
    writeConsent(next);
    setValue(next);
    setSaved(true);
  }

  return (
    <section
      aria-labelledby="cookie-choice-title"
      className="flex flex-col gap-3 border border-line p-6"
    >
      <h2 id="cookie-choice-title" className="t-h3">
        {text.title}
      </h2>
      <p className="t-body-s max-w-[60ch] text-fg-muted">{text.text}</p>
      <fieldset className="flex flex-col">
        <legend className="sr-only">{text.title}</legend>
        <Choice
          label={text.necessary}
          hint={text.necessaryHint}
          checked
          disabled
          readOnly
        />
        {CONSENT_CATEGORIES.map((category) => (
          <Choice
            key={category}
            label={text[category]}
            hint={text[`${category}Hint`]}
            checked={value[category]}
            onChange={(event) => toggle(category, event.target.checked)}
          />
        ))}
      </fieldset>
      <p role="status" className="t-body-s text-fg-muted">
        {saved ? text.saved : ""}
      </p>
    </section>
  );
}
