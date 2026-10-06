import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { formatMoneyDto } from "@/lib/money";
import { getJobForPublic } from "@/modules/jobs/service";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OG_TEXT,
  ogJobCard,
} from "@/modules/seo/og";

/** The picture shown when a job is shared (D297). */
export const alt = OG_TEXT.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The picture reads the database per request, never at build time (D210).
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const job = await getJobForPublic(id, { locale });
  const t = await getTranslations({ locale, namespace: "jobs" });
  const money = locale === "ru" ? "ru-RU" : "en-US";
  const card = job
    ? ogJobCard({
        title: job.title,
        company: job.company.name,
        salary: job.salaryMin
          ? `${formatMoneyDto(job.salaryMin, money)}${
              job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""
            } / ${t(job.salaryMin.period)}`
          : null,
        facts: [
          t(job.workFormat),
          t(job.employmentType),
          job.timezoneRequired ?? "",
        ],
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
        <div style={{ fontSize: 68, lineHeight: 1.1, fontWeight: 700 }}>
          {card ? card.title : OG_TEXT.tagline}
        </div>
        {card ? (
          <div style={{ fontSize: 40, color: OG_COLORS.muted }}>
            {card.company}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          borderTop: `2px solid ${OG_COLORS.line}`,
          paddingTop: 32,
        }}
      >
        {card?.salary ? (
          <div style={{ fontSize: 44 }}>{card.salary}</div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 30,
            color: OG_COLORS.muted,
          }}
        >
          <div style={{ display: "flex" }}>{card ? card.facts : ""}</div>
          <div style={{ display: "flex" }}>{OG_TEXT.domain}</div>
        </div>
      </div>
    </div>,
    size,
  );
}
