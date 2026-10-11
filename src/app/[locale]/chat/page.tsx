import { setRequestLocale } from "next-intl/server";
import { Chat } from "@/components/bot/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getJobForPublic } from "@/modules/jobs/service";

export const dynamic = "force-dynamic";

const JOB_ID = /^[0-9a-f-]{36}$/i;

/** `/chat` (section 9): the bot for guests and users (7A). `?job=` opens that vacancy (D382). */
export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { locale } = await params;
  const { job } = await searchParams;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const jobId = job && JOB_ID.test(job) ? job : undefined;
  const row = jobId ? await getJobForPublic(jobId, { locale }) : null;
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Chat
        signedIn={user !== null}
        jobId={row?.id}
        focus={
          row
            ? { title: row.title, company: row.company.name }
            : undefined
        }
      />
    </main>
  );
}
