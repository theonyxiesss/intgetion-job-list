import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";

// unstable_cache needs the Next runtime; pass through with a JSON round trip,
// exactly what the persistent cache does to stored values.
vi.mock("next/cache", () => ({
  unstable_cache:
    <T>(fn: () => Promise<T>) =>
    async () =>
      JSON.parse(JSON.stringify(await fn())) as T,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: () => undefined,
}));
// A guest: no session.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@/modules/auth/service", () => ({ getCurrentUser: async () => null }));
vi.mock("@/modules/billing/service", () => ({
  promotedHireJobIds: async () => [],
}));
// next-intl's client navigation imports "next/navigation" in a way Node ESM
// cannot resolve outside Next; the page only needs Link to render.
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({ children }: { children?: unknown }) => children,
    redirect: () => undefined,
    usePathname: () => "/",
    useRouter: () => ({}),
    getPathname: () => "/",
  }),
}));

import JobPage from "@/app/[locale]/jobs/[id]/page";
import { getGuestPicks } from "./guest-picks";

const userId = randomUUID();
const companyId = randomUUID();
const jobId = randomUUID();
const description =
  "Integration test role description long enough for all schema constraints.";

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("Integration tests require a loopback database");
  }
  const db = getDb();
  await db.execute(
    sql`insert into public.users(id,auth_uid,terms_accepted_at,terms_version) values (${userId},${randomUUID()},now(),'pages-integration')`,
  );
  await db.execute(
    sql`insert into public.companies(id,name,slug,status,created_by) values (${companyId},'Pages Test',${`pages-${companyId.slice(0, 8)}`},'verified',${userId})`,
  );
  await db.execute(
    sql`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,status,published_at,expires_at) values
    (${jobId},${companyId},'Pages regression role',${description},'engineering','remote','full_time','internal','published',now(),now()+interval '30 days')`,
  );
});

afterAll(async () => {
  await getDb().execute(
    sql`delete from public.companies where id=${companyId}`,
  );
  await getDb().execute(sql`delete from public.users where id=${userId}`);
});

const render = () =>
  JobPage({ params: Promise.resolve({ locale: "en", id: jobId }) });

describe("public pages follow the live job status", () => {
  it("renders a published job and lists it in the guest picks", async () => {
    await expect(render()).resolves.toBeDefined();
    const picks = await getGuestPicks("en");
    expect(
      [...picks.promoted, ...picks.items].some((job) => job.id === jobId),
    ).toBe(true);
  });

  it("answers 404 and drops it from the guest picks once closed", async () => {
    await getDb().execute(
      sql`update public.jobs set status='closed' where id=${jobId}`,
    );
    await expect(render()).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    const picks = await getGuestPicks("en");
    expect(
      [...picks.promoted, ...picks.items].some((job) => job.id === jobId),
    ).toBe(false);
  });
});
