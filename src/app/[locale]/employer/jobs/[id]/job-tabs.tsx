import { getTranslations } from "next-intl/server";
import { LinkTabs } from "@/components/ui";

/** DESIGN.md 9.0: «Вакансия · Отклики» on an employer job. */
export async function EmployerJobTabs({
  jobId,
  active,
}: {
  jobId: string;
  active: "job" | "applications";
}) {
  const t = await getTranslations("employerJobs");
  const pipeline = await getTranslations("employerApplications");
  return (
    <LinkTabs
      label={t("jobSections")}
      indicatorName="employer-job-tab"
      items={[
        {
          label: t("tabJob"),
          href: `/employer/jobs/${jobId}`,
          active: active === "job",
        },
        {
          label: pipeline("open"),
          href: `/employer/jobs/${jobId}/applications`,
          active: active === "applications",
        },
      ]}
    />
  );
}
