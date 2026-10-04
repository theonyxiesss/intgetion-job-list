import { Download } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  MarketingOptIn,
  ProfileVisibility,
} from "@/components/settings/settings-controls";
import { Container, Icon, PageHeader, buttonClass } from "@/components/ui";
import { getOwnCandidate } from "@/modules/candidates/service";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsTabs } from "../settings-tabs";

export default async function PrivacySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");
  const profile = await getOwnCandidate(user.id);

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <SettingsTabs active="privacy" />
        <section className="flex flex-col">
          {profile && <ProfileVisibility hidden={profile.isHidden} />}
          <MarketingOptIn enabled={user.marketingOptIn} />
        </section>
        <section
          aria-labelledby="export-title"
          className="flex flex-col gap-3 border border-line p-6"
        >
          <h2 id="export-title" className="t-h3">
            {t("exportTitle")}
          </h2>
          <p className="t-body-s max-w-[60ch] text-fg-muted">
            {t("exportText")}
          </p>
          <a
            href="/api/me/export"
            download
            className={buttonClass("secondary", "md", "self-start")}
          >
            <Icon icon={Download} size={16} />
            {t("exportButton")}
          </a>
        </section>
      </Container>
    </main>
  );
}
