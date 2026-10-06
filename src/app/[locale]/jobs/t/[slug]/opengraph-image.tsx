import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { catalogTag } from "@/config/markers";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { searchJobs } from "@/modules/jobs/service";
import { tagSearchOverrides } from "@/modules/jobs/service/tag-query";
import { tagLabel } from "@/modules/seo/tag-label";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OG_TEXT,
  ogClamp,
} from "@/modules/seo/og";

/** The picture shown when a collection is shared (D300). */
export const alt = OG_TEXT.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The picture reads the database per request, never at build time (D210).
export const dynamic = "force-dynamic";

/** Enough to say «a few» or «dozens» without counting the whole catalogue. */
const COUNT_LIMIT = 50;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const markers = await getTranslations({ locale, namespace: "markers" });
  const tag = catalogTag(slug);
  const overrides = tag ? await tagSearchOverrides(tag) : null;
  const parsed = overrides
    ? jobSearchQuery.safeParse({ ...overrides, limit: String(COUNT_LIMIT) })
    : null;
  const found = parsed?.success
    ? (await searchJobs(parsed.data)).items.length
    : 0;
  const title = tag
    ? tag.kind === "high-paying"
      ? markers("highPayTitle")
      : markers("tagTitle", { name: await tagLabel(tag, locale, slug) })
    : OG_TEXT.tagline;

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
          {ogClamp(title, 60)}
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
        <div style={{ display: "flex" }}>
          {found === 0
            ? OG_TEXT.tagline
            : found >= COUNT_LIMIT
              ? markers("collectionJobsMore", { count: found })
              : markers("collectionJobs", { count: found })}
        </div>
        <div style={{ display: "flex" }}>{OG_TEXT.domain}</div>
      </div>
    </div>,
    size,
  );
}
