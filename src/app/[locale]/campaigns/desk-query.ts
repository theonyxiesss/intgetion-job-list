/**
 * Address of the briefs list with its filters (U2, TZ 48 §4): the chosen
 * company, status group, search word and page live in the URL, so a back
 * button, a bookmark and a shared link keep the same view. Defaults stay
 * out of the address.
 */
export function listHref(input: {
  view: string;
  company?: string | null;
  q?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (input.view && input.view !== "active") params.set("view", input.view);
  if (input.company) params.set("company", input.company);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/campaigns/list?${query}` : "/campaigns/list";
}
