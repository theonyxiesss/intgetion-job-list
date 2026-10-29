import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREELANCE_CATEGORIES, type FreelanceCategory } from "@/config/freelance";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { HttpError } from "@/lib/http";
import { listOpenTasks } from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";
import { freelanceTasksCopy } from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.tasks" });
  return { title: t("metaTitle"), description: t("intro") };
}

function budgetLabel(
  min: bigint | null,
  max: bigint | null,
  locale: string,
  negotiableLabel: string,
) {
  if (min === null && max === null) return negotiableLabel;
  if (min === null) return `≤ ${formatUsd(max!, locale)}`;
  if (max === null) return `≥ ${formatUsd(min, locale)}`;
  return `${formatUsd(min, locale)} – ${formatUsd(max, locale)}`;
}

/** Public task board; before migration 0073 it explains that the feature is pending. */
export default async function FreelanceTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category: rawCategory } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("freelance.tasks");
  const category = FREELANCE_CATEGORIES.includes(
    rawCategory as FreelanceCategory,
  )
    ? (rawCategory as FreelanceCategory)
    : undefined;
  const copy = await freelanceTasksCopy(locale);
  let tasks: Awaited<ReturnType<typeof listOpenTasks>> = [];
  let notReady = false;
  try {
    tasks = await listOpenTasks({ category });
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) notReady = true;
    else throw error;
  }

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          intro={t("intro")}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/freelance/tasks/new" className={buttonClass("primary")}>
                {t("postTask")}
              </Link>
              <Link href="/freelance/tasks/mine" className={buttonClass("secondary")}>
                {t("myTasks")}
              </Link>
            </div>
          }
        />
        {notReady ? (
          <p role="status" className="border border-line p-4 text-fg-muted">
            {t("comingSoon")}
          </p>
        ) : (
          <>
            <form action="" className="max-w-sm">
              <Field label={t("category")}>
                <Select name="category" defaultValue={category ?? ""}>
                  <option value="">{t("anyCategory")}</option>
                  {FREELANCE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {copy[`category_${item}`]}
                    </option>
                  ))}
                </Select>
              </Field>
            </form>
            {tasks.length === 0 ? (
              <EmptyState
                title={t("empty")}
                action={
                  <Link href="/freelance/tasks/new" className="underline underline-offset-4">
                    {t("postTask")}
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/freelance/tasks/${task.id}`}
                      className="flex flex-col gap-3 p-4 hover:bg-surface md:p-6"
                    >
                      <span className="flex flex-wrap items-center justify-between gap-3">
                        <span className="t-h3">{task.title}</span>
                        <Badge>{copy[`category_${task.category}`]}</Badge>
                      </span>
                      <span className="line-clamp-3 whitespace-pre-wrap text-fg-muted">
                        {task.description}
                      </span>
                      <span className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-fg-muted">
                        <span className="font-mono">
                          {budgetLabel(task.budgetMinMinor, task.budgetMaxMinor, locale, t("negotiable"))}
                        </span>
                        {task.wantedBy ? <span>{t("wantedBy")}: {task.wantedBy}</span> : null}
                        <span>{task.postedBy === "company" ? t("company") : t("person")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
