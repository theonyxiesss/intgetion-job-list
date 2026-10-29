import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { HttpError } from "@/lib/http";
import { listOpenTasks } from "@/modules/freelance/service";
import { TaskCreateForm } from "@/modules/freelance/ui/task-create-form";
import { freelanceTasksCopy, userOrLogin } from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.tasks" });
  return { title: t("postTask") };
}

export default async function NewFreelanceTaskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await userOrLogin(locale);
  const t = await getTranslations("freelance.tasks");
  const copy = await freelanceTasksCopy(locale);
  let ready = true;
  try {
    await listOpenTasks({ limit: 1 });
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) ready = false;
    else throw error;
  }
  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("postTask")} intro={t("createIntro")} />
        {ready ? (
          <TaskCreateForm copy={copy} />
        ) : (
          <p role="status" className="border border-line p-4 text-fg-muted">
            {t("comingSoon")}
          </p>
        )}
      </Container>
    </main>
  );
}
