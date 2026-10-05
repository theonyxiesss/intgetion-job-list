import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chat } from "@/components/bot/chat";
import { Container, PageHeader } from "@/components/ui/container";
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
  const t = await getTranslations("chat");
  return (
    <main className="md:py-16">
      <Container className="md:flex md:max-w-3xl md:flex-col md:gap-8">
        <div className="max-md:hidden">
          <PageHeader title={t("title")} intro={t("intro")} />
        </div>
        <Chat signedIn={user !== null} />
      </Container>
    </main>
  );
}
