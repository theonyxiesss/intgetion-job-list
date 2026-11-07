"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { McpAccess } from "@/components/settings/mcp-access";
import { DeleteAccount } from "@/components/settings/settings-controls";
import { BillingPanel, type PayPlan } from "./billing-panel";

export type SettingsPanel = "account" | "assistants" | "billing";

type McpProps = Parameters<typeof McpAccess>[0];

/**
 * The parts of the account that never pass through Spoki (TZ 53): a data
 * export, deleting the account, and AI-assistant tokens. A token is a secret
 * and deleting cannot be undone, so they stay out of the conversation and
 * the model; the chat home shows them as panels beside it.
 */
export function SettingsPanelView({
  panel,
  scopes,
  plan = null,
}: {
  panel: SettingsPanel;
  scopes: McpProps["scopes"];
  /** The plan a payment link asked for. */
  plan?: PayPlan | null;
}) {
  const t = useTranslations("morrow.panels");
  return (
    <div className="morrow-room morrow-panel">
      <div className="morrow-room-head">
        <strong>{t(`${panel}.title`)}</strong>
        <span>{t(`${panel}.lead`)}</span>
      </div>
      <div className="morrow-room-feed">
        {panel === "account" ? (
          <AccountPanel />
        ) : panel === "billing" ? (
          <BillingPanel initialPlan={plan} />
        ) : (
          <AssistantsPanel scopes={scopes} />
        )}
      </div>
    </div>
  );
}

function AccountPanel() {
  const t = useTranslations("morrow.panels.account");
  return (
    <>
      <section className="morrow-panel-block" aria-labelledby="export-title">
        <h2 id="export-title">{t("exportTitle")}</h2>
        <p>{t("exportText")}</p>
        <a href="/api/me/export" download className="morrow-panel-button">
          <Download size={16} aria-hidden="true" />
          {t("exportButton")}
        </a>
      </section>
      <DeleteAccount />
    </>
  );
}

function AssistantsPanel({ scopes }: { scopes: McpProps["scopes"] }) {
  const t = useTranslations("morrow.panels.assistants");
  const [data, setData] = useState<Omit<McpProps, "scopes"> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [tokens, connections] = await Promise.all([
          fetch("/api/mcp/personal-tokens", { cache: "no-store" }),
          fetch("/api/mcp/connections", { cache: "no-store" }),
        ]);
        if (!tokens.ok || !connections.ok) throw new Error("load");
        setData({
          tokens: ((await tokens.json()) as { tokens: McpProps["tokens"] })
            .tokens,
          connections: (
            (await connections.json()) as {
              connections: McpProps["connections"];
            }
          ).connections,
        });
      } catch {
        setFailed(true);
      }
    };
    const first = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(first);
  }, []);

  if (!data) {
    return (
      <p className="morrow-room-status" role={failed ? "alert" : "status"}>
        {failed ? t("failed") : t("loading")}
      </p>
    );
  }
  return (
    <McpAccess
      tokens={data.tokens}
      connections={data.connections}
      scopes={scopes}
    />
  );
}
