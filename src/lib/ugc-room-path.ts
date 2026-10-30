import { routing } from "@/i18n/routing";

/**
 * `/campaigns/{id}/room/{inviteId}`, including a language prefix (D577).
 * Only this page may frame a platform player; see security-headers.ts.
 */
export function isUgcRoomPath(pathname: string): boolean {
  const prefixes = routing.locales
    .filter((locale) => locale !== routing.defaultLocale)
    .join("|");
  return new RegExp(
    `^/(?:(?:${prefixes})/)?campaigns/[^/]+/room/[^/]+/?$`,
  ).test(pathname);
}
