"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  label?: string;
  clientName?: string;
  scopes: string[];
  expiresAt?: string | Date;
  lastUsedAt?: string | Date | null;
  createdAt: string | Date;
};
type Props = { tokens: Item[]; connections: Item[]; scopes: readonly string[] };

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

export function McpAccess({
  tokens: initialTokens,
  connections: initialConnections,
  scopes,
}: Props) {
  const t = useTranslations("mcp");
  const [tokens, setTokens] = useState(initialTokens);
  const [connections, setConnections] = useState(initialConnections);
  const [label, setLabel] = useState("");
  const [chosen, setChosen] = useState<string[]>(["profile:read"]);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState(false);

  async function createToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    const response = await send("/api/mcp/personal-tokens", "POST", {
      label,
      scopes: chosen,
    }).catch(() => null);
    if (!response?.ok) return setError(true);
    const created = (await response.json()) as { id: string; token: string };
    setSecret(created.token);
    setLabel("");
    const updated = await send("/api/mcp/personal-tokens", "GET").catch(
      () => null,
    );
    if (updated?.ok)
      setTokens(((await updated.json()) as { tokens: Item[] }).tokens);
  }

  async function revokeToken(id: string) {
    const response = await send("/api/mcp/personal-tokens", "DELETE", {
      id,
    }).catch(() => null);
    if (!response?.ok) return setError(true);
    setTokens(tokens.filter((item) => item.id !== id));
  }

  async function revokeConnection(id: string) {
    const response = await send("/api/mcp/connections", "DELETE", { id }).catch(
      () => null,
    );
    if (!response?.ok) return setError(true);
    setConnections(connections.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <p role="alert" className="text-danger">
          {t("settingsError")}
        </p>
      )}
      <section className="surface-card flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-semibold">
          {t("tokensTitle")}
        </h2>
        <p className="t-body-s text-fg-muted">{t("tokensHint")}</p>
        {secret && (
          <div className="rounded-xl border border-warning p-4">
            <p className="mb-2 font-medium">{t("tokenOnce")}</p>
            <code className="block break-all">{secret}</code>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => void navigator.clipboard.writeText(secret)}
            >
              {t("copy")}
            </Button>
          </div>
        )}
        <form onSubmit={createToken} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            {t("tokenLabel")}
            <input
              className="rounded-xl border border-line bg-surface px-4 py-3"
              value={label}
              maxLength={80}
              required
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium">{t("permissions")}</legend>
            {scopes.map((scope) => (
              <label key={scope} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={chosen.includes(scope)}
                  onChange={(event) =>
                    setChosen(
                      event.target.checked
                        ? [...chosen, scope]
                        : chosen.filter((value) => value !== scope),
                    )
                  }
                />
                {t(`scope.${scope}`)}
              </label>
            ))}
          </fieldset>
          <Button type="submit">{t("createToken")}</Button>
        </form>
        <ul className="divide-y divide-line">
          {tokens.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <span>
                {item.label} · {item.scopes.join(", ")}
              </span>
              <Button
                variant="danger"
                onClick={() => void revokeToken(item.id)}
              >
                {t("disconnect")}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="surface-card flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-semibold">
          {t("connectionsTitle")}
        </h2>
        <p className="t-body-s text-fg-muted">{t("connectionsHint")}</p>
        {connections.length ? (
          <ul className="divide-y divide-line">
            {connections.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>
                  {item.clientName} · {item.scopes.join(", ")}
                </span>
                <Button
                  variant="danger"
                  onClick={() => void revokeConnection(item.id)}
                >
                  {t("disconnect")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted">{t("noConnections")}</p>
        )}
      </section>
    </div>
  );
}
