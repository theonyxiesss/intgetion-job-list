import {
  getAuthUserLoginState,
  isPlaceholderEmail,
} from "@/lib/supabase/admin";
import type { CurrentUser } from "./auth-service";

/**
 * The email channel can deliver only to a confirmed address that is not a
 * Telegram placeholder (D217).
 */
export function mailChannelAvailable(
  email: string | null,
  confirmed: boolean,
): boolean {
  return Boolean(email) && confirmed && !isPlaceholderEmail(email!);
}

/** Whether this account can turn on "new jobs by email" (D349). */
export async function canReceiveMail(user: CurrentUser): Promise<boolean> {
  const state = await getAuthUserLoginState(user.authUid);
  if (!state) return false;
  return mailChannelAvailable(state.email, state.confirmed);
}
