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
