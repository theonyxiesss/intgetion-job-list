"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, type AbstractIntlMessages } from "next-intl";
import { MergeMessages } from "./merge-messages";

/**
 * Loads extra message namespaces in the browser and adds them to the shell
 * set, for a part of the layout that appears on demand (D476, D525). Pass
 * the namespaces as a literal list: `client-namespaces.test.ts` reads it
 * like `RouteMessages`.
 */
export function FetchedMessages({
  namespaces,
  fallback,
  children,
}: {
  namespaces: readonly string[];
  fallback: ReactNode;
  children: (messages: Record<string, unknown>) => ReactNode;
}) {
  const locale = useLocale();
  const ns = namespaces.join(",");
  const [loaded, setLoaded] = useState<{
    key: string;
    messages: Record<string, unknown>;
  } | null>(null);
  const key = `${locale}:${ns}`;

  useEffect(() => {
    let live = true;
    fetch(
      `/api/bot/messages?locale=${encodeURIComponent(locale)}&ns=${encodeURIComponent(ns)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((messages: Record<string, unknown> | null) => {
        if (live && messages) setLoaded({ key, messages });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [locale, ns, key]);

  if (!loaded || loaded.key !== key) return fallback;
  return (
    <MergeMessages messages={loaded.messages as AbstractIntlMessages}>
      {children(loaded.messages)}
    </MergeMessages>
  );
}
