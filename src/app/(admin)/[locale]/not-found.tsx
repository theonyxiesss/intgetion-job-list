import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ButtonLink, Container, Icon, OrbitBackdrop } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative flex flex-1 items-center overflow-hidden py-24">
      <OrbitBackdrop faint />
      <Container className="relative flex flex-col items-start gap-6">
        <p className="t-data-l text-fg-muted">{t("code")}</p>
        <h1 className="t-display-l">{t("title")}</h1>
        <p className="max-w-[48ch] text-fg-muted">{t("body")}</p>
        <ButtonLink
          href="/"
          variant="secondary"
          icon={<Icon icon={ArrowLeft} />}
        >
          {t("home")}
        </ButtonLink>
      </Container>
    </main>
  );
}
