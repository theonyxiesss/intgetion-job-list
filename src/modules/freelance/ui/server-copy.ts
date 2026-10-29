import { getTranslations } from "next-intl/server";
import {
  FREELANCE_CATEGORIES,
  FREELANCE_ORDER_STATUSES,
  FREELANCE_TIERS,
} from "@/config/freelance";
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

/** Task board copy plus the existing freelance category labels. */
export async function freelanceTasksCopy(locale: string): Promise<ClientCopy> {
  const t = await getTranslations({ locale, namespace: "freelance" });
  const copy: ClientCopy = { ...(t.raw("tasks") as ClientCopy) };
  for (const category of FREELANCE_CATEGORIES) {
    copy[`category_${category}`] = t(`categories.${category}`);
  }
  return copy;
}

/**
 * Texts for the order room (TZ 45): `room_*` lines, room error lines that
 * win over the general ones, and `status_*` names for the feed.
 */
export async function orderRoomCopy(locale: string): Promise<ClientCopy> {
  const t = await getTranslations({ locale, namespace: "freelance" });
  const copy: ClientCopy = { ...(t.raw("client") as ClientCopy) };
  for (const [key, value] of Object.entries(
    t.raw("room") as Record<string, string>,
  )) {
    copy[key.startsWith("error_") ? key : `room_${key}`] = value;
  }
  for (const status of FREELANCE_ORDER_STATUSES) {
    copy[`status_${status}`] = t(`orders.status.${status}`);
  }
  return copy;
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
