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

/** Rows on one page of any desk list (U2, TZ 48 §4). */
export const DESK_ROWS = 10;

export type Paged<T> = {
  items: T[];
  page: number;
  pages: number;
  total: number;
};

/** One page of a list; a page past the end gives the last one. */
export function paginate<T>(
  items: readonly T[],
  rawPage: number | undefined,
  size = DESK_ROWS,
): Paged<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(Math.floor(rawPage ?? 1) || 1, 1), pages);
  return {
    items: items.slice((page - 1) * size, page * size),
    page,
    pages,
    total: items.length,
  };
}

/** Address of a desk page with its filters; defaults stay out of it. */
export function deskPath(
  path: string,
  input: {
    view?: string;
    defaultView?: string;
    company?: string | null;
    page?: number;
  },
): string {
  const params = new URLSearchParams();
  if (input.view && input.view !== input.defaultView) {
    params.set("view", input.view);
  }
  if (input.company) params.set("company", input.company);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
