"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

type Order = {
  id: string;
  status: string;
  plan: "start" | "hire";
  chainId: number;
  token: string;
  tokenContract: string;
  recipient: string;
  tokenAmount: string;
};

function transferData(to: string, amount: bigint): `0x${string}` {
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  return `0x${"a9059cbb"}${address}${value}`;
}

function units(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  return BigInt(whole + frac.padEnd(6, "0").slice(0, 6));
}

export function CryptoPay({
  jobId,
  projectId,
}: {
  jobId: string;
  projectId: string;
}) {
  const t = useTranslations("billing");
  const [token, setToken] = useState<"USDC" | "USDT">("USDC");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const mod = await import("@walletconnect/ethereum-provider");
      const provider = await mod.EthereumProvider.init({
        projectId,
        chains: [1],
        optionalChains: [137, 42161, 8453],
        showQrModal: true,
        metadata: {
          name: "INTGETION JOB LIST",
          description: "Pay for Hire",
          url: window.location.origin,
          icons: [`${window.location.origin}/icon.png`],
        },
      });
      await provider.connect();
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      const chainHex = (await provider.request({
        method: "eth_chainId",
      })) as string;
      const address = accounts[0];
      const chainId = Number(chainHex);
      if (!address) throw new Error("wallet");
      const nonce = await fetch("/api/billing/crypto/siwe/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, chainId }),
      });
      if (!nonce.ok) throw new Error("nonce");
      const { message } = (await nonce.json()) as { message: string };
      const signature = (await provider.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;
      const verified = await fetch("/api/billing/crypto/siwe/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      if (!verified.ok) throw new Error("verify");
      const created = await fetch("/api/billing/crypto/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, token }),
      });
      if (!created.ok) throw new Error("order");
      const next = (await created.json()) as Order;
      setOrder(next);
      if (next.status === "paid") return;
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: next.tokenContract,
            data: transferData(next.recipient, units(next.tokenAmount)),
          },
        ],
      })) as string;
      const confirmed = await fetch("/api/billing/crypto/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: next.id, txHash: hash }),
      });
      if (!confirmed.ok) throw new Error("confirm");
      setOrder((await confirmed.json()) as Order);
      const timer = window.setInterval(async () => {
        const fresh = await fetch(`/api/billing/crypto/orders/${next.id}`);
        if (!fresh.ok) return;
        const body = (await fresh.json()) as Order;
        setOrder(body);
        if (body.status !== "awaiting_payment" && body.status !== "checking") {
          window.clearInterval(timer);
        }
      }, 4000);
    } catch {
      setError(t("status.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        {t("token")}
        <select
          value={token}
          onChange={(event) => setToken(event.target.value as "USDC" | "USDT")}
          className="rounded-md border border-line bg-bg px-3 py-2"
        >
          <option value="USDC">{t("usdc")}</option>
          <option value="USDT">{t("usdt")}</option>
        </select>
      </label>
      <Button type="button" onClick={pay} disabled={busy}>
        {t("connect")}
      </Button>
      {order ? (
        <div className="flex flex-col gap-2 text-sm">
          <p>{t(`status.${order.status as "paid"}`)}</p>
          <p>{t("checkWallet")}</p>
          <p className="font-mono break-all">{order.recipient}</p>
          <p>
            {order.tokenAmount} {order.token}
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm">{error}</p> : null}
    </div>
  );
}
