import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listFollows } from "@/modules/follows/service";
import { FollowList } from "@/modules/follows/ui/follow-list";
import { listSavedSearches } from "@/modules/saved-searches/service";
import { SavedSearchList } from "@/modules/saved-searches/ui/saved-search-list";

export const dynamic = "force-dynamic";

/** The user's saved catalog searches and their alerts (D233). */
export default async function SavedSearchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect({ href: "/login", locale });
  const t = await getTranslations("savedSearches");
  const [searches, follows] = await Promise.all([
    listSavedSearches(user!.id),
    listFollows(user!.id),
  ]);

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-6">
        <PageHeader title={t("title")} intro={t("intro")} />
        <SavedSearchList
          initial={searches.map(({ id, name, query, alert }) => ({
            id,
            name,
            query,
            alert,
          }))}
        />
        <FollowList
          initial={follows.map((follow) => ({
            slug: follow.companySlug,
            name: follow.companyName,
          }))}
        />
      </Container>
    </main>
  );
}
