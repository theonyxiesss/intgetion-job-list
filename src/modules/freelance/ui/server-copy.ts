import { getTranslations } from "next-intl/server";
import { FREELANCE_CATEGORIES, FREELANCE_TIERS } from "@/config/freelance";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import type { ClientCopy } from "./client-api";

/**
 * Texts for the freelance client components, built on the server so the
 * `freelance` namespace does not ship on every page.
 */
export async function freelanceClientCopy(locale: string): Promise<ClientCopy> {
  const t = await getTranslations({ locale, namespace: "freelance" });
  const client = t.raw("client") as ClientCopy;
  const extra: ClientCopy = {};
  for (const category of FREELANCE_CATEGORIES) {
    extra[`category_${category}`] = t(`categories.${category}`);
  }
  for (const tier of FREELANCE_TIERS) {
    extra[`tier_${tier}`] = t(`tiers.${tier}`);
  }
  return { ...client, ...extra };
}

/** The signed-in user, or a redirect to sign-in for a guest. */
export async function userOrLogin(locale: string) {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }
}
