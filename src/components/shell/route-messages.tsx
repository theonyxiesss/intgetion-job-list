import type { ReactNode } from "react";
import type { AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickMessages } from "@/i18n/client-messages";
import { MergeMessages } from "./merge-messages";

/**
 * Sends the namespaces this page's client components read, on top of the
 * shell set from the layout (D476). Wrap the part of the page that renders
 * them; `client-namespaces.test.ts` checks the list.
 */
export async function RouteMessages({
  namespaces,
  children,
}: {
  namespaces: readonly string[];
  children: ReactNode;
}) {
  const all = (await getMessages()) as Record<string, unknown>;
  const messages = pickMessages(all, namespaces) as AbstractIntlMessages;
  return <MergeMessages messages={messages}>{children}</MergeMessages>;
}
