import { setRequestLocale } from "next-intl/server";
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
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Chat signedIn={user !== null} />
    </main>
  );
}
