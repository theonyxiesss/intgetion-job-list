"use client";

import { useState } from "react";
import { Choice } from "@/components/ui/choice";
import { writeConsent, type Consent } from "@/lib/consent";

export interface CookieChoiceText {
  title: string;
  text: string;
  necessary: string;
  all: string;
  saved: string;
}

/**
 * Change the cookie choice made in the banner (D201): withdrawing consent
 * must be as easy as giving it. Applies at once, no save button.
 */
export function CookieChoice({
  initial,
  text,
}: {
  initial: Consent | null;
  text: CookieChoiceText;
}) {
  const [value, setValue] = useState<Consent>(initial ?? "necessary");
  const [saved, setSaved] = useState(false);

  function choose(consent: Consent) {
    writeConsent(consent);
    setValue(consent);
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
        {(["necessary", "all"] as const).map((option) => (
          <Choice
            key={option}
            type="radio"
            name="cookie-consent"
            value={option}
            checked={value === option}
            onChange={() => choose(option)}
            label={text[option]}
          />
        ))}
      </fieldset>
      <p role="status" className="t-body-s text-fg-muted">
        {saved ? text.saved : ""}
      </p>
    </section>
  );
}
