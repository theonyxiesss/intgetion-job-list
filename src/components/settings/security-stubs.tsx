import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

const ITEMS = ["twoFactor", "wallet"] as const;

/** Two-factor sign-in and a wallet link — placeholders only (D200). */
export async function SecurityStubs() {
  const t = await getTranslations("settings.security");
  return (
    <section
      aria-labelledby="security-title"
      className="flex flex-col gap-4 border border-line p-5"
    >
      <h2 id="security-title" className="t-h3">
        {t("title")}
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium">{t(`${item}.title`)}</p>
              <p className="t-body-s text-fg-muted">{t(`${item}.text`)}</p>
            </div>
            <Badge>{t("soon")}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
