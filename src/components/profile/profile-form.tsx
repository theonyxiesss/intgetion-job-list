"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";

export type ProfileFormValues = {
  fullName: string;
  headline: string;
  desiredTitles: string;
  country: string;
  city: string;
  timezone: string;
  workHoursStart: string;
  workHoursEnd: string;
  workDays: number[];
  workFormats: string[];
  employmentTypes: string[];
  experienceYears: string;
  salaryMin: string;
  salaryCurrency: string;
  salaryPeriod: string;
  salaryBasis: string;
  skills: string;
  skillLevel: string;
  language: string;
  languageLevel: string;
  contactEmail: string;
  phone: string;
  categories: string[];
  companySizes: string[];
  notes: string | null;
  sectors: string[];
  seniority: string;
  jobSearchStatus: string;
};

export type ProfileMarkerOption = { value: string; label: string };

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const FORMATS = ["remote", "hybrid", "onsite"] as const;
const EMPLOYMENT = [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
] as const;
const LEVELS = ["novice", "intermediate", "advanced", "expert"] as const;
const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2", "native"] as const;
const PERIODS = ["hour", "month", "year"] as const;
const BASIS = ["gross", "net"] as const;
const JOB_SEARCH = ["active", "passive", "not_looking"] as const;

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function list(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function errorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { code?: string } };
    return body.error?.code ?? "generic";
  } catch {
    return "generic";
  }
}

export function ProfileForm({
  initial,
  sectors,
  seniority,
}: {
  initial: ProfileFormValues;
  sectors: readonly ProfileMarkerOption[];
  seniority: readonly ProfileMarkerOption[];
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const timezoneRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const input = timezoneRef.current;
    if (input && !input.value) {
      input.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    if (form.get("confirmTimezone") !== "on") {
      setError("timezone_confirm");
      return;
    }

    const skills = list(String(form.get("skills") ?? "")).map((raw) => ({
      raw,
      level: String(form.get("skillLevel")),
      years: null,
    }));
    const experienceCompany = blank(
      String(form.get("experienceCompany") ?? ""),
    );
    const experience =
      experienceCompany === null
        ? []
        : [
            {
              companyName: experienceCompany,
              title: String(form.get("experienceTitle") ?? "").trim(),
              startMonth: String(form.get("experienceStart") ?? ""),
              endMonth: blank(String(form.get("experienceEnd") ?? "")),
              description: blank(
                String(form.get("experienceDescription") ?? ""),
              ),
            },
          ];
    const language = blank(String(form.get("language") ?? ""));
    const years = blank(String(form.get("experienceYears") ?? ""));
    const profile = {
      fullName: blank(String(form.get("fullName") ?? "")),
      headline: blank(String(form.get("headline") ?? "")),
      desiredTitles: list(String(form.get("desiredTitles") ?? "")),
      country: blank(String(form.get("country") ?? ""))?.toUpperCase() ?? null,
      city: blank(String(form.get("city") ?? "")),
      timezone: String(form.get("timezone") ?? "").trim(),
      workHoursStart: String(form.get("workHoursStart") ?? ""),
      workHoursEnd: String(form.get("workHoursEnd") ?? ""),
      workDays: form.getAll("workDays").map((day) => Number(day)),
      workFormats: form.getAll("workFormats").map(String),
      employmentTypes: form.getAll("employmentTypes").map(String),
      experienceYears: years === null ? null : Number(years),
      availabilityDate: blank(String(form.get("availabilityDate") ?? "")),
      salaryMin: blank(String(form.get("salaryMin") ?? "")),
      salaryMax: blank(String(form.get("salaryMax") ?? "")),
      salaryCurrency:
        blank(String(form.get("salaryCurrency") ?? ""))?.toUpperCase() ?? null,
      salaryPeriod: blank(String(form.get("salaryMin") ?? ""))
        ? String(form.get("salaryPeriod"))
        : null,
      salaryBasis: blank(String(form.get("salaryMin") ?? ""))
        ? String(form.get("salaryBasis"))
        : null,
      minOverlapHours: Number(form.get("minOverlapHours") ?? 3),
      summary: blank(String(form.get("summary") ?? "")),
      isHidden: form.get("isHidden") === "on",
      jobSearchStatus: String(form.get("jobSearchStatus") ?? "active"),
      skills,
      experience,
      languages: language
        ? [
            {
              lang: language.toLowerCase(),
              level: String(form.get("languageLevel")),
            },
          ]
        : [],
      preferences: {
        categories: initial.categories,
        companySizes: initial.companySizes,
        notes: initial.notes,
        sectors: form.getAll("sectors").map(String).slice(0, 5),
        seniority: blank(String(form.get("seniority") ?? "")),
      },
    };

    setPending(true);
    const saved = await fetch("/api/candidates/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!saved.ok) {
      setPending(false);
      setError(await errorCode(saved));
      return;
    }

    const contacts = await fetch("/api/candidates/me/contacts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("contactEmail") ?? "").trim(),
        phone: blank(String(form.get("phone") ?? "")),
        telegram: blank(String(form.get("telegram") ?? "")),
        linkedinUrl: blank(String(form.get("linkedinUrl") ?? "")),
        websiteUrl: blank(String(form.get("websiteUrl") ?? "")),
      }),
    });
    setPending(false);
    if (!contacts.ok) {
      setError(await errorCode(contacts));
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? (
        <p role="alert" className="border border-danger px-3 py-2 text-danger">
          {error === "timezone_confirm"
            ? t("errors.timezone_confirm")
            : t("errors.generic")}
        </p>
      ) : null}

      <div id="basics" />
      <label className="flex flex-col gap-1 font-medium" htmlFor="full-name">
        {t("fields.fullName")}
        <input
          id="full-name"
          name="fullName"
          defaultValue={initial.fullName}
          maxLength={120}
          className={controlClass}
        />
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="headline">
        {t("fields.headline")}
        <input
          id="headline"
          name="headline"
          defaultValue={initial.headline}
          maxLength={160}
          className={controlClass}
        />
      </label>
      <label
        className="flex flex-col gap-1 font-medium"
        htmlFor="desired-titles"
      >
        {t("fields.desiredTitles")}
        <input
          id="desired-titles"
          name="desiredTitles"
          defaultValue={initial.desiredTitles}
          className={controlClass}
        />
        <span className="text-sm font-normal opacity-80">
          {t("fields.desiredTitlesHint")}
        </span>
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="country">
        {t("fields.country")}
        <input
          id="country"
          name="country"
          defaultValue={initial.country}
          maxLength={2}
          className={controlClass}
        />
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="city">
        {t("fields.city")}
        <input
          id="city"
          name="city"
          defaultValue={initial.city}
          maxLength={80}
          className={controlClass}
        />
      </label>
      <div id="preferences" />
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">{t("fields.sectors")}</legend>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {sectors.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="sectors"
                value={option.value}
                defaultChecked={initial.sectors.includes(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 font-medium" htmlFor="seniority">
        {t("fields.seniority")}
        <select
          id="seniority"
          name="seniority"
          defaultValue={initial.seniority}
          className={controlClass}
        >
          <option value="" />
          {seniority.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="timezone">
        {t("fields.timezone")}
        <input
          ref={timezoneRef}
          id="timezone"
          name="timezone"
          defaultValue={initial.timezone}
          required
          className={controlClass}
        />
        <span className="text-sm font-normal opacity-80">
          {t("fields.timezoneHint")}
        </span>
      </label>
      <label
        className="flex min-h-11 items-center gap-2"
        htmlFor="confirm-timezone"
      >
        <input id="confirm-timezone" name="confirmTimezone" type="checkbox" />
        {t("fields.confirmTimezone")}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">{t("fields.workDays")}</legend>
        {WEEKDAYS.map((day) => (
          <label key={day} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="workDays"
              value={day}
              defaultChecked={initial.workDays.includes(day)}
            />
            {t(`weekdays.${day}`)}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 font-medium" htmlFor="hours-start">
        {t("fields.workHoursStart")}
        <input
          id="hours-start"
          name="workHoursStart"
          type="time"
          defaultValue={initial.workHoursStart}
          required
          className={controlClass}
        />
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="hours-end">
        {t("fields.workHoursEnd")}
        <input
          id="hours-end"
          name="workHoursEnd"
          type="time"
          defaultValue={initial.workHoursEnd}
          required
          className={controlClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">{t("fields.workFormats")}</legend>
        {FORMATS.map((format) => (
          <label key={format} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="workFormats"
              value={format}
              defaultChecked={initial.workFormats.includes(format)}
            />
            {t(`formats.${format}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">{t("fields.employmentTypes")}</legend>
        {EMPLOYMENT.map((kind) => (
          <label key={kind} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="employmentTypes"
              value={kind}
              defaultChecked={initial.employmentTypes.includes(kind)}
            />
            {t(`employment.${kind}`)}
          </label>
        ))}
      </fieldset>

      <div id="experience" />
      <label
        className="flex flex-col gap-1 font-medium"
        htmlFor="experience-years"
      >
        {t("fields.experienceYears")}
        <input
          id="experience-years"
          name="experienceYears"
          type="number"
          min={0}
          max={60}
          defaultValue={initial.experienceYears}
          className={controlClass}
        />
      </label>
      <label
        id="skills"
        className="flex flex-col gap-1 font-medium"
        htmlFor="skill-names"
      >
        {t("fields.skills")}
        <input
          id="skill-names"
          name="skills"
          defaultValue={initial.skills}
          className={controlClass}
        />
        <span className="text-sm font-normal opacity-80">
          {t("fields.skillsHint")}
        </span>
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="skill-level">
        {t("fields.skillLevel")}
        <select
          id="skill-level"
          name="skillLevel"
          defaultValue={initial.skillLevel}
          className={controlClass}
        >
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`levels.${level}`)}
            </option>
          ))}
        </select>
      </label>
      <div id="languages" />
      <label className="flex flex-col gap-1 font-medium" htmlFor="language">
        {t("fields.language")}
        <input
          id="language"
          name="language"
          defaultValue={initial.language}
          maxLength={2}
          className={controlClass}
        />
      </label>
      <label
        className="flex flex-col gap-1 font-medium"
        htmlFor="language-level"
      >
        {t("fields.languageLevel")}
        <select
          id="language-level"
          name="languageLevel"
          defaultValue={initial.languageLevel}
          className={controlClass}
        >
          {CEFR.map((level) => (
            <option key={level} value={level}>
              {t(`cefr.${level}`)}
            </option>
          ))}
        </select>
      </label>
      <div id="salary" />
      <label className="flex flex-col gap-1 font-medium" htmlFor="salary-min">
        {t("fields.salaryMin")}
        <input
          id="salary-min"
          name="salaryMin"
          inputMode="numeric"
          defaultValue={initial.salaryMin}
          className={controlClass}
        />
      </label>
      <label
        className="flex flex-col gap-1 font-medium"
        htmlFor="salary-currency"
      >
        {t("fields.salaryCurrency")}
        <input
          id="salary-currency"
          name="salaryCurrency"
          defaultValue={initial.salaryCurrency}
          maxLength={3}
          className={controlClass}
        />
      </label>
      <label
        className="flex flex-col gap-1 font-medium"
        htmlFor="salary-period"
      >
        {t("fields.salaryPeriod")}
        <select
          id="salary-period"
          name="salaryPeriod"
          defaultValue={initial.salaryPeriod}
          className={controlClass}
        >
          {PERIODS.map((period) => (
            <option key={period} value={period}>
              {t(`periods.${period}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="salary-basis">
        {t("fields.salaryBasis")}
        <select
          id="salary-basis"
          name="salaryBasis"
          defaultValue={initial.salaryBasis}
          className={controlClass}
        >
          {BASIS.map((basis) => (
            <option key={basis} value={basis}>
              {t(`basis.${basis}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="job-search">
        {t("fields.jobSearchStatus")}
        <select
          id="job-search"
          name="jobSearchStatus"
          defaultValue={initial.jobSearchStatus}
          className={controlClass}
        >
          {JOB_SEARCH.map((status) => (
            <option key={status} value={status}>
              {t(`jobSearch.${status}`)}
            </option>
          ))}
        </select>
      </label>

      <h2 className="text-xl font-semibold">{t("contactsTitle")}</h2>
      <p className="text-sm opacity-80">{t("contactsHint")}</p>
      <label
        className="flex flex-col gap-1 font-medium"
        htmlFor="contact-email"
      >
        {t("fields.contactEmail")}
        <input
          id="contact-email"
          name="contactEmail"
          type="email"
          required
          defaultValue={initial.contactEmail}
          className={controlClass}
        />
      </label>
      <label className="flex flex-col gap-1 font-medium" htmlFor="phone">
        {t("fields.phone")}
        <input
          id="phone"
          name="phone"
          defaultValue={initial.phone}
          className={controlClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className={buttonClass("primary")}
      >
        {t("fields.save")}
      </button>
    </form>
  );
}
