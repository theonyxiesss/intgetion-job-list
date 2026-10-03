import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LatestJobs } from "@/modules/jobs/ui/latest-jobs";

const categoryIds = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "finance",
  "hr",
] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const categories = await getTranslations("categories");
  const product = await getTranslations("product");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm">{product("name")}</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {t("tagline")}
        </h1>
        <p className="text-lg">{t("subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="#search"
            className="inline-flex min-h-11 items-center rounded-md bg-foreground px-4 text-background"
          >
            {t("findJob")}
          </a>
          <a
            href="#post"
            className="inline-flex min-h-11 items-center rounded-md border border-current px-4"
          >
            {t("postJob")}
          </a>
        </div>
      </section>

      <section id="search" className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">{t("searchLabel")}</h2>
        <form className="flex flex-wrap gap-2" action="" method="get">
          <label className="sr-only" htmlFor="q">
            {t("searchLabel")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            className="min-h-11 min-w-64 flex-1 rounded-md border border-current/30 bg-transparent px-3"
          />
          <button
            type="submit"
            className="min-h-11 rounded-md border border-current px-4"
          >
            {t("searchSubmit")}
          </button>
        </form>
      </section>

      <section id="categories" className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">{t("categoriesTitle")}</h2>
        <ul className="flex flex-wrap gap-2">
          {categoryIds.map((id) => (
            <li key={id}>
              <a
                href={`#category-${id}`}
                id={`category-${id}`}
                className="inline-flex min-h-11 items-center rounded-md border border-current/30 px-3"
              >
                {categories(id)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section id="latest" className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">{t("latestTitle")}</h2>
        <LatestJobs locale={locale} />
      </section>

      <section id="benefits" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">{t("benefitsTitle")}</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          <li className="rounded-md border border-current/20 p-4">
            <h3 className="font-semibold">{t("benefitBotTitle")}</h3>
            <p>{t("benefitBotBody")}</p>
          </li>
          <li className="rounded-md border border-current/20 p-4">
            <h3 className="font-semibold">{t("benefitMatchTitle")}</h3>
            <p>{t("benefitMatchBody")}</p>
          </li>
          <li className="rounded-md border border-current/20 p-4">
            <h3 className="font-semibold">{t("benefitContactsTitle")}</h3>
            <p>{t("benefitContactsBody")}</p>
          </li>
        </ul>
      </section>

      <section id="post">
        <p>{t("postNote")}</p>
      </section>
    </main>
  );
}
