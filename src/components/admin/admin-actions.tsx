"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

async function post(path: string, body?: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

function useAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run(path: string, body?: unknown) {
    setPending(true);
    setFailed(false);
    const response = await post(path, body);
    setPending(false);
    if (!response.ok) {
      setFailed(true);
      return;
    }
    router.refresh();
  }
  return { pending, failed, run };
}

export function UserStatusAction({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const t = useTranslations("admin");
  const { pending, failed, run } = useAction();
  if (status !== "active" && status !== "suspended") return null;
  const suspend = status === "active";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(`/api/admin/users/${userId}/${suspend ? "suspend" : "unsuspend"}`)
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {suspend ? t("suspend") : t("unsuspend")}
      </button>
      {failed && (
        <span role="alert" className="text-sm text-danger">
          {t("actionFailed")}
        </span>
      )}
    </span>
  );
}

export function SuggestionActions({
  suggestionId,
  skills,
}: {
  suggestionId: string;
  skills: { id: string; label: string }[];
}) {
  const t = useTranslations("admin");
  const { pending, failed, run } = useAction();
  const [skillId, setSkillId] = useState("");
  const selectId = `skill-${suggestionId}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {t("mapTo")}
      </label>
      <select
        id={selectId}
        value={skillId}
        onChange={(event) => setSkillId(event.target.value)}
        className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
      >
        <option value="">{t("chooseSkill")}</option>
        {skills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || !skillId}
        onClick={() =>
          run(`/api/admin/taxonomy/suggestions/${suggestionId}/map`, {
            skillId,
          })
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("map")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(`/api/admin/taxonomy/suggestions/${suggestionId}/reject`)
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("reject")}
      </button>
      {failed && (
        <span role="alert" className="text-sm text-danger">
          {t("actionFailed")}
        </span>
      )}
    </span>
  );
}

export function QueueDecision({ itemId }: { itemId: string }) {
  const t = useTranslations("admin");
  const { pending, failed, run } = useAction();
  const [note, setNote] = useState("");
  const noteId = `note-${itemId}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label htmlFor={noteId} className="sr-only">
        {t("decisionNote")}
      </label>
      <input
        id={noteId}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("decisionNote")}
        maxLength={1000}
        className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(`/api/admin/queue/${itemId}/decide`, {
            decision: "approved",
            ...(note.trim() ? { note } : {}),
          })
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("approve")}
      </button>
      <button
        type="button"
        disabled={pending || !note.trim()}
        onClick={() =>
          run(`/api/admin/queue/${itemId}/decide`, {
            decision: "rejected",
            note,
          })
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("reject")}
      </button>
      {failed && (
        <span role="alert" className="text-sm text-danger">
          {t("actionFailed")}
        </span>
      )}
    </span>
  );
}

export function RemoveJobAction({ jobId }: { jobId: string }) {
  const t = useTranslations("admin");
  const { pending, failed, run } = useAction();
  const [reason, setReason] = useState("");
  const reasonId = `reason-${jobId}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label htmlFor={reasonId} className="sr-only">
        {t("removeReason")}
      </label>
      <input
        id={reasonId}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t("removeReason")}
        maxLength={500}
        className="min-h-11 rounded-md border border-current/30 bg-transparent px-2"
      />
      <button
        type="button"
        disabled={pending || reason.trim().length < 3}
        onClick={() => run(`/api/admin/jobs/${jobId}/remove`, { reason })}
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("remove")}
      </button>
      {failed && (
        <span role="alert" className="text-sm text-danger">
          {t("actionFailed")}
        </span>
      )}
    </span>
  );
}

export function ReportDecision({ reportId }: { reportId: string }) {
  const t = useTranslations("admin");
  const { pending, failed, run } = useAction();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(`/api/admin/reports/${reportId}/decide`, {
            decision: "confirmed",
          })
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("confirmReport")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(`/api/admin/reports/${reportId}/decide`, {
            decision: "dismissed",
          })
        }
        className="min-h-11 rounded-md border border-current px-3"
      >
        {t("dismissReport")}
      </button>
      {failed && (
        <span role="alert" className="text-sm text-danger">
          {t("actionFailed")}
        </span>
      )}
    </span>
  );
}
