import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";

/** Settings pages send guests to the login page. */
export async function requireSettingsUser(locale: string) {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }
}
