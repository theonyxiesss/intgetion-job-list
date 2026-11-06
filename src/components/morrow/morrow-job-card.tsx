"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUp,
  Bookmark,
  ChevronRight,
  FileText,
  Sparkles,
} from "lucide-react";
import { handSpokiAsk } from "@/components/bot/spoki-ask";
import type { ChatJob, ChatJobCardText } from "@/components/bot/chat-job-card";
import { intlLocale } from "@/i18n/locale";
import { formatMoneyDto } from "@/lib/money";

type Details =
  { state: "loading" | "error" } | { state: "ready"; text: string };

/**
 * A job in the chat home, drawn as the Morrow mockup's opportunity card
 * (TZ 53): it opens in place, and saving, the letter and applying go to the
 * chat, where Spoki's own tools and confirmation card do the work.
 */
export function MorrowJobCard({
  job,
  text,
}: {
  job: ChatJob;
  text: ChatJobCardText;
}) {
  const t = useTranslations("chat.jobCard");
  const explain = useTranslations("explain");
  const money = intlLocale(useLocale());
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const subject = { title: job.title, company: job.companyName, id: job.id };

  const place = job.location?.trim() || job.locationCountry || text.worldwide;
  const format =
    job.workFormat in text.formats
      ? text.formats[job.workFormat as keyof ChatJobCardText["formats"]]
      : null;
  const salary = job.salaryMin
    ? `${formatMoneyDto(job.salaryMin, money)}${
        job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""
      } / ${text.periods[job.salaryMin.period]}`
    : null;
  const reasons = (job.explain ?? [])
    .slice(0, 2)
    .map((line) =>
      explain(line.detail.key.replace(/^explain\./, ""), line.detail.params),
    );

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || details?.state === "ready") return;
    setDetails({ state: "loading" });
    try {
      const response = await fetch(`/api/jobs/${job.id}`);
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as {
        job: { description?: string | null };
      };
      setDetails({ state: "ready", text: body.job.description?.trim() ?? "" });
    } catch {
      setDetails({ state: "error" });
    }
  }

  return (
    <article className={`op-card ${open ? "op-card-expanded" : ""}`}>
      <button
        type="button"
        className="op-card-main"
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        <span className="op-top">
          <span className="company-mark" aria-hidden="true">
            {job.companyName.trim().charAt(0).toUpperCase()}
          </span>
          <span className="op-title">
            <b>{job.title}</b>
            <span>
              {job.companyName} · {place}
            </span>
          </span>
          {job.score !== undefined ? (
            <span className="match">
              <b>{Math.round(job.score * 100)}%</b>
              <span>{t("match")}</span>
            </span>
          ) : null}
        </span>
        <span className="op-meta">
          {format ? <span>{format}</span> : null}
          {salary ? <span>{salary}</span> : null}
        </span>
        <span className="card-expand-label">
          {open ? t("less") : t("more")} <ChevronRight size={13} />
        </span>
      </button>
      {open ? (
        <div className="op-detail">
          {details?.state === "ready" ? (
            <p>{details.text || t("empty")}</p>
          ) : (
            <p role="status">
              {details?.state === "error" ? t("error") : t("loading")}
            </p>
          )}
          {reasons.length > 0 ? (
            <div className="why-match">
              <Sparkles size={14} aria-hidden="true" />
              <span>{reasons.join(" ")}</span>
            </div>
          ) : null}
          <div className="detail-actions">
            <button
              type="button"
              onClick={() => handSpokiAsk(t("askLetter", subject))}
            >
              <FileText size={13} aria-hidden="true" />
              {t("letter")}
            </button>
            <button
              type="button"
              onClick={() => handSpokiAsk(t("askApply", subject))}
            >
              {t("apply")} <ArrowUp size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
      <div className="op-actions">
        <span>{job.score !== undefined ? t("forYou") : t("opportunity")}</span>
        <button
          type="button"
          className="save-btn"
          onClick={() => handSpokiAsk(t("askSave", subject))}
        >
          <Bookmark size={14} aria-hidden="true" /> {t("save")}
        </button>
      </div>
    </article>
  );
}
