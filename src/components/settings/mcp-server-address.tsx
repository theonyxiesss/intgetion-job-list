"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** v2 (UI_V2) «MCP server address» card from the settings mockup. */
export function McpServerAddress({ url }: { url: string }) {
  const t = useTranslations("mcp");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="mcp-server-address"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <span className="flex min-w-0 flex-col">
        <h2 id="mcp-server-address" className="text-xs text-fg-subtle">
          {t("serverAddress")}
        </h2>
        <code className="font-mono text-sm break-all">{url}</code>
      </span>
      <Button type="button" variant="secondary" onClick={copy}>
        <span aria-live="polite">
          {copied ? t("serverCopied") : t("serverCopy")}
        </span>
      </Button>
    </section>
  );
}
