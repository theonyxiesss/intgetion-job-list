"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { JOB_CATEGORIES } from "@/config/markers";
import { Button } from "@/components/ui/button";
import type { JobGoal, JobGoalFilters } from "@/modules/bot/service/job-goal";

export type JobGoalAction =
  | { action: "start" | "filters"; filters: JobGoalFilters }
  | { action: "save" | "pause" | "resume" | "delete" | "skip_profile" };

type PanelProps = {
  goal: JobGoal | null;
  signedIn: boolean;
  busy: boolean;
  onAction: (action: JobGoalAction) => Promise<void>;
};

/** A new goal object remounts the form, so its inputs start from the saved filters. */
export function JobGoalPanel(props: PanelProps) {
  return (
    <GoalControls
      key={props.goal ? `${props.goal.updatedAt}:${props.goal.status}` : "none"}
      {...props}
    />
  );
}

function GoalControls({ goal, signedIn, busy, onAction }: PanelProps) {
  const t = useTranslations("chat.jobGoal");
  const categoryName = useTranslations("categories");
  const [category, setCategory] = useState(goal?.filters.categorySlug ?? "");
  const [country, setCountry] = useState(goal?.filters.countryCode ?? "");
  const [remoteOnly, setRemoteOnly] = useState(
    goal?.filters.remoteOnly ?? false,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filters: JobGoalFilters = {
      ...(category
        ? { categorySlug: category as JobGoalFilters["categorySlug"] }
        : {}),
      ...(country.trim() ? { countryCode: country.trim().toUpperCase() } : {}),
      remoteOnly,
    };
    void onAction({ action: goal ? "filters" : "start", filters });
  }

  return (
    <section
      aria-label={t("title")}
      aria-busy={busy}
      className="mt-3 rounded-lg border border-line bg-surface p-3"
    >
      <p className="text-sm font-medium text-fg">{t("title")}</p>
      {goal ? (
        <p className="mt-1 text-sm text-fg-muted" role="status">
          {t(`step.${goal.step}`)}
          {goal.status === "paused" ? ` · ${t("paused")}` : ""}
          {goal.savedAt ? ` · ${t("saved")}` : ""}
        </p>
      ) : (
        <p className="mt-1 text-sm text-fg-muted">{t("intro")}</p>
      )}
      {goal?.status !== "paused" ? (
        <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-fg-muted">
            {t("category")}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={busy}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-2 text-sm text-fg"
            >
              <option value="">{t("anyCategory")}</option>
              {JOB_CATEGORIES.map((slug) => (
                <option key={slug} value={slug}>
                  {categoryName(slug)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-fg-muted">
            {t("country")}
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              maxLength={2}
              pattern="[A-Za-z]{2}"
              placeholder={t("countryHint")}
              disabled={busy}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-2 text-sm text-fg"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm text-fg">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(event) => setRemoteOnly(event.target.checked)}
              disabled={busy}
            />
            {t("remoteOnly")}
          </label>
          <Button
            type="submit"
            size="md"
            disabled={busy}
            className="sm:col-span-3"
          >
            {t(goal ? "update" : "start")}
          </Button>
        </form>
      ) : null}
      {goal ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {goal.step === "profile" && goal.status !== "paused" ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void onAction({ action: "skip_profile" })}
            >
              {t("skipProfile")}
            </Button>
          ) : null}
          {signedIn && !goal.savedAt ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void onAction({ action: "save" })}
            >
              {t("save")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void onAction({
                action: goal.status === "paused" ? "resume" : "pause",
              })
            }
          >
            {t(goal.status === "paused" ? "resume" : "pause")}
          </Button>
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => void onAction({ action: "delete" })}
              >
                {t("confirmDelete")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t("cancel")}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      ) : null}
      {goal && !goal.savedAt ? (
        <p className="mt-2 text-xs text-fg-muted">
          {signedIn ? t("saveHint") : t("sessionOnly")}
        </p>
      ) : null}
    </section>
  );
}
