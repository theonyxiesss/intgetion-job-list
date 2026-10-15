import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { sellerInput, setAcceptingOrders } from "@/modules/freelance/service";

/** `POST /api/freelance/seller` `{ accepting }` — «Беру заказы» (28.2). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, sellerInput);
    const seller = await setAcceptingOrders(user.id, input.accepting);
    return Response.json({ seller: { accepting: seller.accepting } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
