import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import {
  getVisibleCompany,
  listPublishedJobsForCompany,
} from "@/modules/jobs/service";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OG_TEXT,
  ogCompanyCard,
} from "@/modules/seo/og";

/** The picture shown when a company page is shared (D297). */
export const alt = OG_TEXT.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The picture reads the database per request, never at build time (D210).
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const company = await getVisibleCompany(slug);
  const t = await getTranslations({ locale, namespace: "companyPage" });
  // One query after the other on one pooled connection (D247).
  const jobs = company
    ? await listPublishedJobsForCompany(company.id, locale)
    : [];
  const card = company
    ? ogCompanyCard({
        name: company.name,
        openJobs: jobs.length,
        jobsLabel: (count) => t("openJobs", { count }),
      })
    : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{ fontSize: 30, letterSpacing: 8, color: OG_COLORS.signal }}
        >
          {OG_TEXT.wordmark}
        </div>
        <div style={{ fontSize: 76, lineHeight: 1.1, fontWeight: 700 }}>
          {card ? card.name : OG_TEXT.tagline}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${OG_COLORS.line}`,
          paddingTop: 32,
          fontSize: 34,
          color: OG_COLORS.muted,
        }}
      >
        <div style={{ display: "flex" }}>{card ? card.jobs : ""}</div>
        <div style={{ display: "flex" }}>{OG_TEXT.domain}</div>
      </div>
    </div>,
    size,
  );
}
