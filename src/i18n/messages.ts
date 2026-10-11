import en from "@/messages/en.json";
import es from "@/messages/es.json";
import de from "@/messages/de.json";
import fr from "@/messages/fr.json";
import it from "@/messages/it.json";
import ptBR from "@/messages/pt-BR.json";
import ru from "@/messages/ru.json";
import type { AppLocale } from "./routing";

export type Messages = typeof en;

const catalogs: Record<AppLocale, Messages> = { en, ru, es, "pt-BR": ptBR, de, fr, it };

/**
 * D336: the message catalog for server code that renders outside a React
 * request (emails, Telegram, notifications). Pages use next-intl instead.
 */
export function messagesFor(locale: string): Messages {
  return catalogs[locale as AppLocale] ?? en;
}
