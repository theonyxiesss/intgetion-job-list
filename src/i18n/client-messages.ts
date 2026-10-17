/**
 * Message namespaces sent to the browser (D41b, D476). The layout sends only
 * what the shell reads on every page: the header and its sign-in dialog, the
 * locale switch, the error page and the Mini App bar. A page that renders a
 * client component reading another namespace adds it with `RouteMessages`.
 * `client-namespaces.test.ts` fails when a page misses one.
 */
export const SHELL_NAMESPACES = [
  "nav",
  "ui",
  "locale",
  "error",
  "auth",
  "miniApp",
] as const;

/** The top-level namespaces of `all` named in `namespaces`, others dropped. */
export function pickMessages(
  all: Record<string, unknown>,
  namespaces: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    namespaces.filter((key) => key in all).map((key) => [key, all[key]]),
  );
}
