import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chat } from "@/components/bot/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";

export const dynamic = "force-dynamic";

/** `/chat` (section 9): the bot for guests and users (7A). */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const jobs = await getTranslations("jobs");
  // D377: job cards in the chat use the catalog's labels.
  const cardText = {
    salary: jobs("salaryMin"),
    worldwide: jobs("worldwide"),
    viewJob: jobs("viewJob"),
    formats: {
      remote: jobs("remote"),
      hybrid: jobs("hybrid"),
      onsite: jobs("onsite"),
    },
    periods: { hour: jobs("hour"), month: jobs("month"), year: jobs("year") },
  };
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Chat signedIn={user !== null} cardText={cardText} />
    </main>
  );
}
