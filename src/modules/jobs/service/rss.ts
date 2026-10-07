/**
 * RSS 2.0 feed of the newest published jobs (D204, MARKERS.md 7a). Pure:
 * the route reads the jobs and passes plain items here. `selfPath` lets a
 * tag feed point at itself; the catalog feed keeps `/jobs/rss.xml`.
 */

export interface RssJob {
  id: string;
  title: string;
  companyName: string;
  publishedAt: string | null;
  /** Ready-made salary text, or null when the job has none. */
  salary: string | null;
  /** Imported jobs name their source so the feed credits it. */
  sourceName?: string | null;
  categories: readonly string[];
}

export interface RssChannel {
  title: string;
  description: string;
  /** Absolute site origin without a trailing slash. */
  siteUrl: string;
  locale: string;
  /** Path after `/{locale}`. Defaults to the catalog feed. */
  selfPath?: string;
  /** Page this channel describes. Defaults to the catalog. */
  linkPath?: string;
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: string): string {
  // Control characters other than tab/newline are invalid in XML 1.0.
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[&<>"']/g, (char) => XML_ESCAPES[char]!);
}

function rfc822(value: string): string | null {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toUTCString();
}

function item(job: RssJob, channel: RssChannel): string {
  const link = `${channel.siteUrl}/${channel.locale}/jobs/${job.id}`;
  const description = [job.companyName, job.salary, job.sourceName]
    .filter(Boolean)
    .join(" · ");
  const published = job.publishedAt ? rfc822(job.publishedAt) : null;
  return [
    "    <item>",
    `      <title>${escapeXml(`${job.title} — ${job.companyName}`)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <description>${escapeXml(description)}</description>`,
    ...(published ? [`      <pubDate>${published}</pubDate>`] : []),
    ...job.categories.map(
      (category) => `      <category>${escapeXml(category)}</category>`,
    ),
    "    </item>",
  ].join("\n");
}

export function buildRss(channel: RssChannel, jobs: readonly RssJob[]): string {
  const selfPath = channel.selfPath ?? "/jobs/rss.xml";
  const self = `${channel.siteUrl}/${channel.locale}${selfPath}`;
  const page = `${channel.siteUrl}/${channel.locale}${channel.linkPath ?? "/jobs"}`;
  const newest = jobs
    .map((job) => (job.publishedAt ? Date.parse(job.publishedAt) : NaN))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(page)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${channel.locale}</language>`,
    ...(newest !== undefined
      ? [`    <lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`]
      : []),
    `    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>`,
    ...jobs.map((job) => item(job, channel)),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
