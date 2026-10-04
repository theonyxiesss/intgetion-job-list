"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { consentCookie, readConsent, type Consent } from "@/lib/consent";

export interface CookieBannerText {
  label: string;
  text: string;
  acceptAll: string;
  necessaryOnly: string;
}

/**
 * Cookie choice (D201). Rendered only after hydration; the text stays one
 * short line so it never outgrows the hero as the LCP element. Both buttons
 * have equal weight.
 */
export function CookieBanner({ text }: { text: CookieBannerText }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Reading document.cookie is only possible after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(readConsent(document.cookie) === null);
  }, []);

  function choose(consent: Consent) {
    document.cookie = consentCookie(
      consent,
      window.location.protocol === "https:",
    );
    setOpen(false);
  }

  if (!open) return null;
  return (
    <section
      aria-label={text.label}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-surface"
    >
      <div className="mx-auto flex w-full max-w-[1376px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 xl:px-12">
        {/* One short line: a long text here became the LCP element (D201). */}
        <p className="t-body-s text-fg-muted">{text.text}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => choose("necessary")}>
            {text.necessaryOnly}
          </Button>
          <Button variant="secondary" onClick={() => choose("all")}>
            {text.acceptAll}
          </Button>
        </div>
      </div>
    </section>
  );
}
