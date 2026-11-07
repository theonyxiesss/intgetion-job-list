import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  nonEvmNetwork,
  readyNonEvmNetworks,
} from "@/lib/billing/non-evm/networks";
import { SALE_PLANS } from "@/lib/billing/status";
import { payableCompanies, payableJobs } from "@/modules/billing/service";

export const dynamic = "force-dynamic";

const PLANS = ["plus", "pro", "team", "hire"] as const;

/**
 * `GET /api/billing/checkout` — what the chat home's payment panel needs
 * (TZ 53): whether crypto checkout is on, its rails, the prices, and the
 * jobs and companies a one-off plan can be paid for. Same rules as
 * `/billing/crypto`.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const projectId =
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
    const evm =
      process.env.BILLING_ENABLED === "true" &&
      process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
      Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
    const networks = readyNonEvmNetworks().map((id) => ({
      id,
      tokens: Object.keys(nonEvmNetwork(id)?.tokens ?? {}) as (
        "USDC" | "USDT"
      )[],
    }));
    const ready = evm || networks.length > 0;
    const [jobs, companies] = ready
      ? await Promise.all([payableJobs(user.id), payableCompanies(user.id)])
      : [[], []];
    return Response.json(
      {
        ready,
        evm,
        networks,
        projectId,
        amounts: Object.fromEntries(
          PLANS.map((plan) => [
            plan,
            (SALE_PLANS[plan].priceMinor / BigInt(100)).toString(),
          ]),
        ),
        jobs,
        companies,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
