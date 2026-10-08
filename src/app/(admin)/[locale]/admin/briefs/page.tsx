import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/admin/action";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import {
  BriefSlotForm,
  BriefsPauseSwitch,
} from "@/components/admin/briefs-controls";
import { EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import { HttpError } from "@/lib/http";
import { readBriefsAdmin } from "@/modules/notifications/service";

const time = (iso: string | null) =>
  iso ? iso.replace("T", " ").slice(0, 16) : "—";

/** Morning briefs (D354, spec 20 §7): owner and admin only. */
export default async function AdminBriefsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  try {
    await requireAdminPermission("jobs_scheduler.manage");
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const t = await getTranslations("admin.briefs");
  const view = await readBriefsAdmin();

  return (
    <AdminShell title={t("title")} active="briefs" intro={t("intro")}>
      <section className="flex items-center justify-between gap-4 border border-line p-4">
        <div className="flex flex-col gap-1">
          <p className="t-h3">{t("pause")}</p>
          <p className="text-fg-muted">
            {view.paused ? t("pausedOn") : t("pausedOff")}
          </p>
        </div>
        <BriefsPauseSwitch paused={view.paused} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="t-h2">{t("slots")}</h2>
        {view.slots.map((slot) => {
          const subs = view.subscriptions[slot.id];
          return (
            <div
              key={slot.id}
              className="flex flex-col gap-3 border border-line p-4"
            >
              <p className="t-h3">{t(`slot.${slot.id}`)}</p>
              <p className="t-data text-fg-muted">
                {t("nextRun", {
                  utc: time(slot.nextRunUtc),
                  local: slot.nextRunLocal,
                })}
              </p>
              <p className="text-fg-muted">
                {t("subscriptions", {
                  agent: subs.agent,
                  telegram: subs.telegram,
                  email: subs.email,
                })}
              </p>
              <BriefSlotForm slot={slot} />
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="t-h2">{t("log")}</h2>
        {view.runs.length === 0 ? (
          <EmptyState title={t("logEmpty")} />
        ) : (
          <Table caption={t("log")}>
            <thead>
              <tr>
                <Th>{t("colSlot")}</Th>
                <Th>{t("colDate")}</Th>
                <Th>{t("colStarted")}</Th>
                <Th>{t("colFinished")}</Th>
                <Th>{t("colCandidates")}</Th>
                <Th>{t("colEmployers")}</Th>
                <Th>{t("colSent")}</Th>
                <Th>{t("colEmpty")}</Th>
                <Th>{t("colFailed")}</Th>
                <Th>{t("colMode")}</Th>
              </tr>
            </thead>
            <tbody>
              {view.runs.map((run) => (
                <Tr key={run.id}>
                  <Td mono>{run.slotId}</Td>
                  <Td mono>{run.slotDate}</Td>
                  <Td mono className="whitespace-nowrap">
                    {time(run.startedAt)}
                  </Td>
                  <Td mono className="whitespace-nowrap">
                    {time(run.finishedAt)}
                  </Td>
                  <Td mono>{run.checkedCandidates}</Td>
                  <Td mono>{run.checkedEmployers}</Td>
                  <Td mono>{run.sent}</Td>
                  <Td mono>{run.empty}</Td>
                  <Td mono>{run.failed}</Td>
                  <Td mono>{run.dryRun ? t("modeDry") : t("modeLive")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
