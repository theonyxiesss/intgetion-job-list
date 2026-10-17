"use client";

import { useMemo, type ReactNode } from "react";
import {
  NextIntlClientProvider,
  useLocale,
  useMessages,
  type AbstractIntlMessages,
} from "next-intl";

/**
 * Adds a page's namespaces to the ones the layout already sent. A nested
 * provider replaces messages instead of merging them, so the merge happens
 * here and the shell namespaces are not sent twice (D476).
 */
export function MergeMessages({
  messages,
  children,
}: {
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  const locale = useLocale();
  const parent = useMessages();
  const merged = useMemo(
    () => ({ ...parent, ...messages }),
    [parent, messages],
  );
  return (
    <NextIntlClientProvider locale={locale} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
}
