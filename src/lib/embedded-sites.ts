/**
 * No foreign site is framed. Company and portfolio are pages of this
 * platform (D400). The D388 iframe allowlist no longer applies.
 * This file is loaded from the page security policy, so it must not import
 * anything that needs a path alias.
 */

export function isEmbeddedOrigin(origin: string): boolean {
  void origin;
  return false;
}

/** No path may frame a foreign origin. */
export function embedOriginForPath(pathname: string): string | undefined {
  void pathname;
  return undefined;
}
