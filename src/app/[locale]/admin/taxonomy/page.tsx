import { getTranslations, setRequestLocale } from "next-intl/server";
import { SuggestionActions } from "@/components/admin/admin-actions";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
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
    <AdminShell title={t("taxonomyTitle")}>
      {items.length === 0 ? (
        <p>{t("noSuggestions")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th scope="col">{t("colText")}</th>
              <th scope="col">{t("colOccurrences")}</th>
              <th scope="col">{t("colSource")}</th>
              <th scope="col">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-current/15">
                <td className="py-2">{item.rawText}</td>
                <td>{item.occurrences}</td>
                <td>{item.source}</td>
                <td>
                  <SuggestionActions suggestionId={item.id} skills={skills} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {nextCursor && (
        <Link
          href={{ pathname: "/admin/taxonomy", query: { cursor: nextCursor } }}
          className="underline"
        >
          {t("nextPage")}
        </Link>
      )}
    </AdminShell>
  );
}
