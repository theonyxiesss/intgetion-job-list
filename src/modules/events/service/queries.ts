import type { EventKind, EventTopic } from "@/config/events";
import { CONFS_TECH_SITE } from "../adapters/confs-tech";
import { fixtureEventSource } from "../adapters/fixture";
import * as repo from "../repo/events-repo";
import type { EventSearchQuery } from "../schemas/search";
import { filterForPerson, filterFromQuery } from "./filter";

/** What pages and Spoki may read about an event. */
export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  timeZone: string | null;
  format: repo.EventRow["format"];
  country: string | null;
  city: string | null;
  url: string;
  cfpUrl: string | null;
  cfpEndsAt: Date | null;
  topics: EventTopic[];
  kind: EventKind;
  status: repo.EventRow["status"];
  updatedAt: Date;
  /** The open-data project credited on the page, with its site. */
  source: { name: string; url: string | null };
};

/** Where each source is credited (MIT data needs the attribution). */
const SOURCE_SITES: Record<string, string> = {
  "confs.tech": CONFS_TECH_SITE,
  [fixtureEventSource.sourceName]: fixtureEventSource.attributionUrl,
};

export function toPublicEvent(row: repo.EventRow): PublicEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    allDay: row.allDay,
    timeZone: row.timeZone,
    format: row.format,
    country: row.country,
    city: row.city,
    url: row.url,
    cfpUrl: row.cfpUrl,
    cfpEndsAt: row.cfpEndsAt,
    topics: row.topics,
    kind: row.kind,
    status: row.status,
    updatedAt: row.updatedAt,
    source: { name: row.source, url: SOURCE_SITES[row.source] ?? null },
  };
}

export async function searchEvents(
  query: EventSearchQuery,
  now: Date = new Date(),
): Promise<{ items: PublicEvent[]; hasMore: boolean }> {
  const { items, hasMore } = await repo.findEvents(filterFromQuery(query, now));
  return { items: items.map(toPublicEvent), hasMore };
}

export async function getEventBySlug(
  slug: string,
): Promise<PublicEvent | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const row = await repo.findEventBySlug(slug);
  return row ? toPublicEvent(row) : null;
}

export async function listEventCountries(now: Date = new Date()) {
  return repo.listEventCountries(now);
}

export async function listEventSitemapEntries(now: Date = new Date()) {
  return repo.listEventSitemapRows(now);
}

/** Spoki: upcoming events for one person's topics and place (D413). */
export async function findEventsForPerson(
  input: Parameters<typeof filterForPerson>[0],
  now: Date = new Date(),
): Promise<PublicEvent[]> {
  const { items } = await repo.findEvents(filterForPerson(input, now));
  return items.map(toPublicEvent);
}
