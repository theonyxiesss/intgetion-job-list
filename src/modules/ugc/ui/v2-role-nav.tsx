import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** The brand / creator switch in the UGC V2 mockup; each role has its own real workspace. */
export async function UgcV2RoleNav({ active }: { active: "brand" | "creator" }) {
  const t = await getTranslations("ugc");
  return (
    <nav
      aria-label={t("v2.roleLabel")}
      className="flex rounded-xl border border-line bg-surface-2 p-1 text-sm"
    >
      <Link
        href="/campaigns"
        aria-current={active === "brand" ? "page" : undefined}
        className={`rounded-lg px-3 py-2 ${active === "brand" ? "bg-surface text-fg" : "text-fg-muted"}`}
      >
        {t("v2.brand")}
      </Link>
      <Link
        href="/creator/workspace"
        aria-current={active === "creator" ? "page" : undefined}
        className={`rounded-lg px-3 py-2 ${active === "creator" ? "bg-surface text-fg" : "text-fg-muted"}`}
      >
        {t("v2.creator")}
      </Link>
    </nav>
  );
}
