import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ptBR from "@/messages/pt-BR.json";
import ru from "@/messages/ru.json";
import { siteUrl } from "@/modules/seo/site";
import { localePrefix } from "@/i18n/paths";

const catalogs = { en, ru, es, "pt-BR": ptBR } as const;

export async function sendHireMail(input: {
  to: string | null;
  locale: string;
  jobId: string;
}): Promise<void> {
  const key = input.locale in catalogs ? input.locale : "en";
  const copy = catalogs[key as keyof typeof catalogs].billing.mail;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!input.to || !apiKey || !from) return;
  const url = `${siteUrl()}${localePrefix(key)}/employer/jobs/${input.jobId}`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: copy.subject,
      text: copy.body.replace("{url}", url),
    }),
  }).catch(() => undefined);
}
