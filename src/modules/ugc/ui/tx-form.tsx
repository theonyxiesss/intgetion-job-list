"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

const TOKENS = ["USDC", "USDT"] as const;

export type TxFormLabels = {
  chain: string;
  token: string;
  txHash: string;
  submit: string;
  /** Takes `{code}`: the server's reason, for the admin only. */
  error: string;
};

/**
 * An admin hands in a transfer sent by hand from the campaign wallet (D466).
 * The server reads the receipt; nothing here sends money.
 */
export function UgcTxForm({
  action,
  body,
  chains,
  labels,
}: {
  action: "payoutTx" | "refundTx";
  body: Record<string, string>;
  chains: readonly string[];
  labels: TxFormLabels;
}) {
  const [chain, setChain] = useState(chains[0] ?? "");
  const [token, setToken] = useState<"USDC" | "USDT">("USDC");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ugc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          ...body,
          chain,
          token,
          txHash: txHash.trim(),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { code?: string };
        } | null;
        setError(labels.error.replace("{code}", data?.error?.code ?? "ERROR"));
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={labels.chain}>
          <Select value={chain} onChange={(e) => setChain(e.target.value)}>
            {chains.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.token}>
          <Select
            value={token}
            onChange={(e) => setToken(e.target.value as "USDC" | "USDT")}
          >
            {TOKENS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={labels.txHash} error={error || null}>
        <Input
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className="font-mono"
          spellCheck={false}
          autoComplete="off"
          pattern="0x[0-9a-fA-F]{64}"
          required
        />
      </Field>
      <Button
        type="submit"
        className="self-start"
        disabled={busy}
        aria-busy={busy}
      >
        {labels.submit}
      </Button>
    </form>
  );
}
