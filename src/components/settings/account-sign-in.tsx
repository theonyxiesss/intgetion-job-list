import { SignInMethods } from "@/components/settings/sign-in-methods";
import { flags } from "@/config/flags";
import { localePrefix } from "@/i18n/paths";
import {
  authAdminAvailable,
  getAuthUserLoginEmail,
  isPlaceholderEmail,
} from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  linkedOAuthAccounts,
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
  signInInsteadOfLink,
  telegramLinkOf,
  type CurrentUser,
} from "@/modules/auth/service";

const accountNotices = new Set([
  "identity_taken",
  "invalid_link",
  "oauth_unavailable",
]);

/** Email, Telegram, Google and X for the signed-in account (D339). */
export async function AccountSignIn({
  locale,
  user,
  error,
  provider,
}: {
  locale: string;
  user: CurrentUser;
  error?: string;
  provider?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const [loginEmail, telegram, oauth] = await Promise.all([
    getAuthUserLoginEmail(user.authUid),
    telegramLinkOf(user),
    linkedOAuthAccounts(supabase.auth),
  ]);
  const token = telegramBotToken();
  const linkHref =
    flags.telegramLoginEnabled && token && authAdminAvailable()
      ? telegramAuthUrl({
          botId: telegramBotId(token),
          origin: siteUrl(),
          returnTo: `${siteUrl()}${localePrefix(locale)}/auth/telegram?link=1`,
        })
      : null;

  return (
    <SignInMethods
      email={loginEmail && !isPlaceholderEmail(loginEmail) ? loginEmail : null}
      telegram={telegram ? { username: telegram.username } : null}
      linkHref={linkHref}
      google={oauth.google}
      x={oauth.x}
      notice={error && accountNotices.has(error) ? error : null}
      enterHref={
        error === "identity_taken"
          ? signInInsteadOfLink(locale, "account", error, provider ?? null)
          : null
      }
    />
  );
}
