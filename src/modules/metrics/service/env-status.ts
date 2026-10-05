import { authAdminAvailable } from "@/lib/supabase/admin";
import { llmFromEnv } from "@/lib/llm";
import { flags } from "@/config/flags";
import { telegramBotToken } from "@/modules/auth/service";

export type EnvCheck = {
  key: string;
  state: "ok" | "missing" | "warning";
  /** Safe detail only: a mode, a port, a provider name — never a value. */
  detail?: string;
};

const present = (value: string | undefined) => Boolean(value?.trim());

/** Port of DATABASE_URL: 6543 is Supabase's transaction pooler. */
function databaseMode(url: string | undefined): EnvCheck {
  if (!present(url)) return { key: "database", state: "missing" };
  try {
    const parsed = new URL(url!);
    const pooled = parsed.hostname.includes("pooler.supabase.com");
    if (pooled && parsed.port === "5432") {
      return { key: "database", state: "warning", detail: "session:5432" };
    }
    return {
      key: "database",
      state: "ok",
      detail: pooled ? `transaction:${parsed.port || "6543"}` : "direct",
    };
  } catch {
    return { key: "database", state: "warning", detail: "unparsed" };
  }
}

/**
 * What production is configured with (D229), so the admin sees at once why
 * a feature is off. Names and modes only; values never leave the server.
 */
export function envStatus(env = process.env): EnvCheck[] {
  const llm = llmFromEnv(env);
  const both = (a?: string, b?: string) =>
    present(a) && present(b)
      ? "ok"
      : present(a) || present(b)
        ? "warning"
        : "missing";
  return [
    databaseMode(env.DATABASE_URL),
    {
      key: "siteUrl",
      state: present(env.NEXT_PUBLIC_SITE_URL) ? "ok" : "missing",
      detail: env.NEXT_PUBLIC_SITE_URL?.trim() || undefined,
    },
    {
      key: "supabaseAdmin",
      state: authAdminAvailable() ? "ok" : "missing",
    },
    { key: "email", state: both(env.RESEND_API_KEY, env.EMAIL_FROM) },
    {
      key: "telegram",
      state: telegramBotToken(env)
        ? authAdminAvailable()
          ? "ok"
          : "warning"
        : present(env.TELEGRAM_BOT_TOKEN)
          ? "warning"
          : "missing",
      detail:
        present(env.TELEGRAM_BOT_TOKEN) && !telegramBotToken(env)
          ? "format"
          : !flags.telegramLoginEnabled
            ? "frozen"
            : undefined,
    },
    {
      key: "bot",
      state: llm ? "ok" : "missing",
      detail: llm ? llm.name : undefined,
    },
    {
      key: "secrets",
      state: [
        env.CRON_SECRET,
        env.PRIVACY_HASH_SECRET,
        env.UNSUBSCRIBE_SECRET,
      ].every(present)
        ? "ok"
        : "missing",
    },
    { key: "sentry", state: present(env.SENTRY_DSN) ? "ok" : "missing" },
  ];
}
