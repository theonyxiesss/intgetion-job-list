import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { readyNonEvmNetworks } from "@/lib/billing/non-evm/networks";
import { SALE_PLANS } from "@/lib/billing/status";
import { payableCompanies, payableJobs } from "@/modules/billing/service";

export const dynamic = "force-dynamic";

const PLANS = ["plus", "pro", "team", "hire"] as const;

/**
 * `GET /api/billing/checkout` — what the chat home's payment panel needs
 * (TZ 53): whether crypto checkout is on, the prices, and the
 * jobs and companies a one-off plan can be paid for. Same rules as
 * `/billing/crypto`.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const evm =
      process.env.BILLING_ENABLED === "true" &&
      process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
      Boolean(process.env.COMPANY_WALLET_ADDRESS?.trim());
    const ready = evm || readyNonEvmNetworks().length > 0;
    const [jobs, companies] = ready
      ? await Promise.all([payableJobs(user.id), payableCompanies(user.id)])
      : [[], []];
    return Response.json(
      {
        ready,
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
