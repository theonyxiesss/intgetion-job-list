/**
 * The `/chat` address of a Spoki thread (D525). Apart from the panel's other
 * rules: the ways into Spoki in every page's shell import only this.
 */

/** The thread the chat shows; the same keys as the `/chat` address. */
export type ChatTarget = {
  job?: string;
  campaign?: string;
  invite?: string;
  service?: string;
  order?: string;
  confirm?: string;
  from?: "services" | "campaigns" | "freelance_sell" | "post_job";
};

/** `/chat` with the same thread, for links and the full-screen address. */
export function chatHref(target: ChatTarget | null): string {
  if (!target) return "/chat";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(target))
    if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/chat?${query}` : "/chat";
}
