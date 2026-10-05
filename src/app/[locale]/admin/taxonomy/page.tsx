import { getTranslations, setRequestLocale } from "next-intl/server";
import { SuggestionActions } from "@/components/admin/admin-actions";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import { EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import {
  listActiveSkills,
  listSuggestions,
  listSuggestionsQuery,
} from "@/modules/admin/service";

export default async function AdminTaxonomyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const query = listSuggestionsQuery.safeParse(await searchParams);
  const [{ items, nextCursor }, catalog] = await Promise.all([
    listSuggestions(
      query.success ? query.data : listSuggestionsQuery.parse({}),
    ),
    listActiveSkills(),
  ]);
  const skills = catalog.map((skill) => ({
    id: skill.id,
    label: `${skill.category} · ${locale === "ru" ? skill.nameRu : skill.nameEn}`,
  }));

  return (
    <AdminShell title={t("taxonomyTitle")} active="taxonomy">
      {items.length === 0 ? (
        <EmptyState title={t("noSuggestions")} />
      ) : (
        <Table className="min-w-0" caption={t("taxonomyTitle")}>
          <thead>
            <tr>
              <Th>{t("colText")}</Th>
              <Th numeric>{t("colOccurrences")}</Th>
              <Th>{t("colSource")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>{item.rawText}</Td>
                <Td numeric>{item.occurrences}</Td>
                <Td className="text-fg-muted">{item.source}</Td>
                <Td>
                  <SuggestionActions suggestionId={item.id} skills={skills} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {nextCursor && (
        <NextPageLink
          href={{ pathname: "/admin/taxonomy", query: { cursor: nextCursor } }}
        />
      )}
    </AdminShell>
  );
}
