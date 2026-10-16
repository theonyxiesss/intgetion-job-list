"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { connectWallet, type WalletRoute } from "./connect-wallet";
import { classifyPayError } from "./pay-error";
import type { FreelancePayCopy } from "./freelance-pay";

/**
 * The freelancer proves the payout address with a SIWE signature (28.6,
 * D463). Buyers pay to this address; the platform never holds the money.
 */
export function PayoutWallet({
  address,
  projectId,
  copy,
}: {
  address: string | null;
  projectId: string;
  copy: FreelancePayCopy;
}) {
  const [saved, setSaved] = useState(address);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function prove(route: WalletRoute) {
    setBusy(true);
    setMessage("");
    try {
      const provider = await connectWallet(projectId, route);
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      const chainId = Number(
        (await provider.request({ method: "eth_chainId" })) as string,
      );
      const wallet = accounts[0];
      if (!wallet) throw new Error("wallet");
      const nonce = await fetch("/api/freelance/payout/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: wallet, chainId }),
      });
      if (!nonce.ok)
        throw new Error(nonce.status === 400 ? "network" : "nonce");
      const { message: text } = (await nonce.json()) as { message: string };
      const signature = (await provider.request({
        method: "personal_sign",
        params: [text, wallet],
      })) as string;
      const verified = await fetch("/api/freelance/payout/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      if (!verified.ok) {
        const body = (await verified.json().catch(() => null)) as {
          error?: { code?: string };
        } | null;
        setMessage(
          body?.error?.code === "PAYOUT_UNDER_REVIEW"
            ? copy.payoutReview
            : copy.error_failed,
        );
        return;
      }
      const body = (await verified.json()) as { address: string | null };
      setSaved(body.address);
      setMessage(copy.payoutSaved);
    } catch (caught) {
      const kind = classifyPayError(caught);
      setMessage(copy[`error_${kind}`] ?? copy.error_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-4 border border-line bg-surface p-6">
      <h2 className="t-h2">{copy.payoutTitle}</h2>
      <p className="t-body-s text-fg-muted">{copy.payoutText}</p>
      {saved ? (
        <div className="flex flex-col gap-1">
          <p className="t-label text-fg-muted">{copy.payoutCurrent}</p>
          <p className="font-mono text-sm break-all">{saved}</p>
        </div>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => prove("browser")}
        loading={busy}
      >
        {saved ? copy.payoutChange : copy.payoutConfirm}
      </Button>
      {projectId ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => prove("qr")}
          disabled={busy}
        >
          {copy.payQr}
        </Button>
      ) : null}
      {message ? (
        <p role="status" className="t-body-s">
          {message}
        </p>
      ) : null}
    </section>
  );
}
