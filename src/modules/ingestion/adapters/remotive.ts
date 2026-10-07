import type { RawImportedJob } from "./types";

/** Official list Remotive lets other sites show, with a link and their name. */
export const REMOTIVE_JOBS_URL = "https://remotive.com/api/remote-jobs";
export const REMOTIVE_SOURCE_NAME = "Remotive";
/** New jobs per hourly run, so a test catalog fills slowly. */
export const REMOTIVE_DRIP_LIMIT = 3;
const FETCH_TIMEOUT_MS = 15_000;

const CATEGORIES: Record<string, string> = {
  "software development": "engineering",
  "devops / sysadmin": "engineering",
  "qa": "engineering",
  design: "design",
  product: "product",
  "data analysis": "data",
  "data science": "data",
  marketing: "marketing",
  sales: "sales",
  "sales / business": "sales",
  "customer service": "support",
  "finance / legal": "finance",
  "human resources": "hr",
  writing: "content",
  "all others": "operations",
};

const EMPLOYMENT: Record<string, string> = {
  full_time: "full_time",
  "full-time": "full_time",
  part_time: "part_time",
  "part-time": "part_time",
  contract: "contract",
  freelance: "freelance",
  internship: "internship",
};

function plain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

type RemotiveJob = {
  id?: unknown;
  url?: unknown;
  title?: unknown;
  company_name?: unknown;
  category?: unknown;
  tags?: unknown;
  job_type?: unknown;
  description?: unknown;
  salary?: unknown;
};

/** One API row into the import shape. The apply link is the Remotive page. */
export function mapRemotiveJob(row: RemotiveJob): RawImportedJob | null {
  if (typeof row.url !== "string" || !row.url.startsWith("https://remotive.com/")) {
    return null;
  }
  if (typeof row.title !== "string" || !row.title.trim()) return null;
  if (typeof row.company_name !== "string" || !row.company_name.trim()) return null;
  const id = row.id === undefined || row.id === null ? "" : String(row.id).trim();
  if (!id) return null;
  const categoryKey =
    typeof row.category === "string" ? row.category.trim().toLowerCase() : "";
  const employmentKey =
    typeof row.job_type === "string" ? row.job_type.trim().toLowerCase() : "";
  const salary = typeof row.salary === "string" ? row.salary.trim() : "";
  const body = plain(typeof row.description === "string" ? row.description : "");
  const description = salary ? `${body}\n\n${salary}`.trim() : body;
  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  return {
    externalId: id,
    companyName: row.company_name.trim(),
    companyDomain: null,
    title: row.title.trim(),
    description: description || row.title.trim(),
    category: CATEGORIES[categoryKey] ?? "operations",
    employmentType: EMPLOYMENT[employmentKey] ?? "full_time",
    timeZone: null,
    skills: tags,
    applyUrl: row.url,
    expiresAt: null,
  };
}

/**
 * Keep every job already stored (so a short run does not expire it) and only
 * `limit` jobs that are new.
 */
export function withinCreateBudget<T extends { externalId: string }>(
  records: readonly T[],
  linked: ReadonlySet<string>,
  limit: number,
): T[] {
  let room = limit;
  const kept: T[] = [];
  for (const record of records) {
    if (linked.has(record.externalId.trim())) {
      kept.push(record);
      continue;
    }
    if (room <= 0) continue;
    room -= 1;
    kept.push(record);
  }
  return kept;
}

/**
 * The drip stays off unless this is an explicit test host with a local
 * database. Production (intgetion.com, or the cloud database) never receives
 * these jobs from a test branch.
 */
export function testDripAllowed(env?: {
  IMPORT_TEST_DRIP?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  DATABASE_URL?: string;
}): boolean {
  const source = env ?? {
    IMPORT_TEST_DRIP: process.env.IMPORT_TEST_DRIP,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  if (source.IMPORT_TEST_DRIP !== "true") return false;
  let siteHost = "";
  let dbHost = "";
  try {
    siteHost = new URL(source.NEXT_PUBLIC_SITE_URL ?? "").hostname.toLowerCase();
    dbHost = new URL(source.DATABASE_URL ?? "").hostname.toLowerCase();
  } catch {
    return false;
  }
  if (
    siteHost === "intgetion.com" ||
    siteHost.endsWith(".intgetion.com") ||
    siteHost === ""
  ) {
    return false;
  }
  return dbHost === "localhost" || dbHost === "127.0.0.1" || dbHost === "::1";
}

export async function fetchRemotiveJobs(
  fetchImpl: typeof fetch = fetch,
): Promise<RawImportedJob[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(REMOTIVE_JOBS_URL, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "INTGETION-JOB-LIST",
      },
    });
    if (!response.ok) throw new Error(`Remotive responded ${response.status}`);
    const body = (await response.json()) as { jobs?: unknown };
    if (!Array.isArray(body.jobs)) return [];
    return body.jobs.flatMap((row) => {
      const job = mapRemotiveJob(row as RemotiveJob);
      return job ? [job] : [];
    });
  } finally {
    clearTimeout(timer);
  }
}
