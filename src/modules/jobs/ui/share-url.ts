/** Share link with UTM tags, so the own analytics shows the channel (D243). */
export function shareUrl(base: string, medium: string): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", medium);
  return url.toString();
}
