import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Container, PageHeader } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { getTaskView, wasInvited } from "@/modules/freelance/service";
import { TaskProposalForm } from "@/modules/freelance/ui/task-proposal-form";
import { formatUsd } from "@/modules/freelance/ui/format";
import { freelanceTasksCopy } from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const viewer = await requireUser().catch(() => null);
    const task = await getTaskView(viewer?.id ?? null, id);
    return { title: task.title, description: task.description.slice(0, 160) };
  } catch {
    return {};
  }
}

/** Public task details; private tasks are returned as 404 by the service. */
export default async function FreelanceTaskPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("freelance.tasks");
  const viewer = await requireUser().catch(() => null);
  let task;
  try {
    task = await getTaskView(viewer?.id ?? null, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    if (error instanceof HttpError && error.status === 503) {
      return (
        <main className="py-10 md:py-16">
          <Container narrow>
            <p role="status" className="border border-line p-4 text-fg-muted">
              {t("comingSoon")}
            </p>
          </Container>
        </main>
      );
    }
    throw error;
  }
  const invited =
    viewer && task.canPropose ? await wasInvited(viewer.id, task.id) : false;
  const copy = await freelanceTasksCopy(locale);
  const budget =
    task.budgetMinMinor === null && task.budgetMaxMinor === null
      ? t("negotiable")
      : task.budgetMinMinor === null
        ? `≤ ${formatUsd(task.budgetMaxMinor!, locale)}`
        : task.budgetMaxMinor === null
          ? `≥ ${formatUsd(task.budgetMinMinor, locale)}`
          : `${formatUsd(task.budgetMinMinor, locale)} – ${formatUsd(task.budgetMaxMinor, locale)}`;

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={task.title} intro={t("detailIntro")} />
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{copy[`category_${task.category}`]}</Badge>
          <Badge tone={task.status === "open" ? "success" : "neutral"}>
            {t(`status.${task.status}`)}
          </Badge>
          <span className="font-mono">{budget}</span>
          <span className="text-sm text-fg-muted">
            {task.postedBy === "company" ? t("company") : t("person")}
          </span>
        </div>
        {task.wantedBy ? (
          <p><span className="text-fg-muted">{t("wantedBy")}:</span> {task.wantedBy}</p>
        ) : null}
        <p className="max-w-[68ch] whitespace-pre-wrap leading-relaxed">{task.description}</p>
        {task.own ? (
          <Link href="/freelance/tasks/mine" className="underline underline-offset-4">
            {t("myTasks")}
          </Link>
        ) : task.canPropose ? (
          <>
            {invited ? (
              <p role="status" className="border border-line p-4">
                {t("invitedBanner")}
              </p>
            ) : null}
            <TaskProposalForm taskId={task.id} copy={copy} />
          </>
        ) : task.myProposal ? (
          <p role="status" className="border border-line p-4 text-fg-muted">
            {t("alreadyProposed", { status: t(`proposalStatus.${task.myProposal.status}`) })}
          </p>
        ) : !viewer ? (
          <Link href="/login" className="underline underline-offset-4">
            {t("signInToPropose")}
          </Link>
        ) : (
          <p className="text-fg-muted">{t(`status.${task.status}`)}</p>
        )}
      </Container>
    </main>
  );
}
