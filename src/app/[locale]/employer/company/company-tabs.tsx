import { getTranslations } from "next-intl/server";
import { LinkTabs } from "@/components/ui";

/** DESIGN.md 9.0: «Профиль · Верификация» for the company owner. */
export async function CompanyTabs({
  active,
  showVerify,
}: {
  active: "profile" | "verify";
  showVerify: boolean;
}) {
  const t = await getTranslations("company");
  return (
    <LinkTabs
      label={t("title")}
      indicatorName="company-tab"
      items={[
        {
          label: t("tabProfile"),
          href: "/employer/company",
          active: active === "profile",
        },
        ...(showVerify
          ? [
              {
                label: t("tabVerify"),
                href: "/employer/company/verify",
                active: active === "verify",
              },
            ]
          : []),
      ]}
    />
  );
}
