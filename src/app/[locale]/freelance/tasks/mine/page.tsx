import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/i18n/navigation";
import { HttpError } from "@/lib/http";
import {
  listMyTasks,
  listTaskProposals,
  suggestSellers,
  type SuggestedSeller,
} from "@/modules/freelance/service";
import {
  InviteSellers,
  type InviteCard,
} from "@/modules/freelance/ui/invite-sellers";
import { TaskManagementActions } from "@/modules/freelance/ui/task-management-actions";
import { formatUsd } from "@/modules/freelance/ui/format";
import {
  freelanceTasksCopy,
  userOrLogin,
} from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.tasks" });
  return { title: t("myTasks"), robots: { index: false } };
}

export default async function MyFreelanceTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  const t = await getTranslations("freelance.tasks");
  const copy = await freelanceTasksCopy(locale);
  const f = await getTranslations("freelance");
  const cardsOf = (list: SuggestedSeller[]): InviteCard[] =>
    list.map((item) => ({
      sellerId: item.sellerId,
      name: item.name ?? "",
      headline: item.headline,
      badge: item.record.badge ? f(`recordBadge.${item.record.badge}`) : null,
      facts: [
        item.record.completed > 0
          ? f("recordCompleted", { count: item.record.completed })
          : f("recordNone"),
        ...(item.record.onTimeShare !== null
          ? [
              f("recordOnTime", {
                percent: Math.round(item.record.onTimeShare * 100),
              }),
            ]
          : []),
      ],
      invited: item.invited,
      proposed: item.proposed,
    }));
  const inviteLabels = {
    title: t("inviteTitle"),
    none: t("inviteNone"),
    button: t("inviteButton"),
    invited: t("invitedMark"),
    proposed: t("proposedMark"),
    note: t("inviteNote"),
    error: t("inviteError"),
  };
  let tasks: Awaited<ReturnType<typeof listMyTasks>> = [];
  let proposalGroups: Awaited<ReturnType<typeof listTaskProposals>>[] = [];
  let suggestionGroups: SuggestedSeller[][] = [];
  let notReady = false;
  try {
    tasks = await listMyTasks(user.id);
    proposalGroups = await Promise.all(
      tasks.map((task) => listTaskProposals(user.id, task.id)),
    );
    suggestionGroups = await Promise.all(
      tasks.map((task) =>
        task.status === "open"
          ? suggestSellers(user.id, task.id)
          : Promise.resolve([]),
      ),
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) notReady = true;
    else throw error;
  }

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader
          title={t("myTasks")}
          intro={t("myTasksIntro")}
          actions={
            <Link
              href="/freelance/tasks/new"
              className={buttonClass("primary")}
            >
              {t("postTask")}
            </Link>
          }
        />
        {notReady ? (
          <p role="status" className="border border-line p-4 text-fg-muted">
            {t("comingSoon")}
          </p>
        ) : tasks.length === 0 ? (
          <EmptyState
            title={t("myTasksEmpty")}
            action={
              <Link
                href="/freelance/tasks/new"
                className="underline underline-offset-4"
              >
                {t("postTask")}
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-6">
            {tasks.map((task, index) => (
              <li
                key={task.id}
                className="rounded-lg border border-line p-4 md:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/freelance/tasks/${task.id}`}
                      className="t-h3 underline underline-offset-4"
                    >
                      {task.title}
                    </Link>
                    <span className="text-sm text-fg-muted">
                      {copy[`category_${task.category}`]}
                    </span>
                  </div>
                  <Badge>{t(`status.${task.status}`)}</Badge>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-fg-muted">
                  {task.description}
                </p>
                {task.status === "open" ? (
                  <TaskManagementActions taskId={task.id} copy={copy} />
                ) : null}
                {task.status === "open" ? (
                  <InviteSellers
                    taskId={task.id}
                    cards={cardsOf(suggestionGroups[index] ?? [])}
                    labels={inviteLabels}
                  />
                ) : null}
                <h2 className="t-h3 mt-6">
                  {t("proposals", {
                    count: proposalGroups[index]?.length ?? 0,
                  })}
                </h2>
                {(proposalGroups[index] ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-fg-muted">
                    {t("noProposals")}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-line border-y border-line">
                    {proposalGroups[index]?.map((proposal) => (
                      <li
                        key={proposal.id}
                        className="flex flex-col gap-3 py-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono">
                            {formatUsd(proposal.priceMinor, locale)} ·{" "}
                            {t("deliveryDays", {
                              count: proposal.deliveryDays,
                            })}
                          </span>
                          <Badge>
                            {t(`proposalStatus.${proposal.status}`)}
                          </Badge>
                        </div>
                        <p className="whitespace-pre-wrap">{proposal.cover}</p>
                        {proposal.status === "sent" ? (
                          <TaskManagementActions
                            proposalId={proposal.id}
                            copy={copy}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
