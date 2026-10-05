"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import {
  ACCEPT_ALL,
  NECESSARY_ONLY,
  readConsent,
  writeConsent,
  type Consent,
} from "@/lib/consent";

export interface CookieBannerText {
  label: string;
  text: string;
  acceptAll: string;
  necessaryOnly: string;
  customize: string;
  save: string;
  preferences: string;
  preferencesHint: string;
  analytics: string;
  analyticsHint: string;
}

/**
 * Cookie choice (D201, D219). Rendered only after hydration; the text stays
 * one short line so it never outgrows the hero as the LCP element. The three
 * buttons have equal weight; "Customize" opens the two optional categories.
 */
export function CookieBanner({ text }: { text: CookieBannerText }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState<Consent>(NECESSARY_ONLY);

  useEffect(() => {
    // Reading document.cookie is only possible after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(readConsent(document.cookie) === null);
  }, []);

  function choose(consent: Consent) {
    writeConsent(consent);
    setOpen(false);
  }

  if (!open) return null;
  return (
    <section
      aria-label={text.label}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-surface"
    >
      <div className="mx-auto flex w-full max-w-[1376px] flex-col gap-4 px-4 py-4 md:px-6 xl:px-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* One short line: a long text here became the LCP element (D201). */}
          <p className="t-body-s text-fg-muted">{text.text}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => choose(NECESSARY_ONLY)}>
              {text.necessaryOnly}
            </Button>
            <Button variant="secondary" onClick={() => choose(ACCEPT_ALL)}>
              {text.acceptAll}
            </Button>
            <Button
              variant="secondary"
              aria-expanded={custom}
              aria-controls="cookie-categories"
              onClick={() => setCustom((value) => !value)}
            >
              {text.customize}
            </Button>
          </div>
        </div>
        {custom && (
          <fieldset
            id="cookie-categories"
            className="flex flex-col gap-1 border-t border-line pt-3"
          >
            <legend className="sr-only">{text.customize}</legend>
            <Choice
              label={text.preferences}
              hint={text.preferencesHint}
              checked={draft.preferences}
              onChange={(event) =>
                setDraft({ ...draft, preferences: event.target.checked })
              }
            />
            <Choice
              label={text.analytics}
              hint={text.analyticsHint}
              checked={draft.analytics}
              onChange={(event) =>
                setDraft({ ...draft, analytics: event.target.checked })
              }
            />
            <div>
              <Button variant="secondary" onClick={() => choose(draft)}>
                {text.save}
              </Button>
            </div>
          </fieldset>
        )}
      </div>
    </section>
  );
}
