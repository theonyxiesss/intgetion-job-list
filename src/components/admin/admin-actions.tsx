"use client";

import { Ban, Check, Trash2, Undo2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";

async function post(path: string, body?: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

/** One admin action: pending state, refresh on success, toast on failure. */
function useAction() {
  const t = useTranslations("admin");
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  async function run(key: string, path: string, body?: unknown) {
    setPending(key);
    const response = await post(path, body).catch(() => null);
    setPending(null);
    if (!response?.ok) {
      toast.show(t("actionFailed"), "danger");
      return;
    }
    router.refresh();
  }
  return { pending, run };
}

export function UserStatusAction({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const t = useTranslations("admin");
  const { pending, run } = useAction();
  if (status !== "active" && status !== "suspended") return null;
  const suspend = status === "active";
  return (
    <Button
      variant={suspend ? "danger" : "secondary"}
      loading={pending === "status"}
      icon={<Icon icon={suspend ? Ban : Undo2} size={16} />}
      onClick={() =>
        run(
          "status",
          `/api/admin/users/${userId}/${suspend ? "suspend" : "unsuspend"}`,
        )
      }
    >
      {suspend ? t("suspend") : t("unsuspend")}
    </Button>
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
  const { pending, run } = useAction();
  const [skillId, setSkillId] = useState("");
  const selectId = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {t("mapTo")}
      </label>
      <Select
        id={selectId}
        value={skillId}
        onChange={(event) => setSkillId(event.target.value)}
        className="w-auto min-w-48"
      >
        <option value="">{t("chooseSkill")}</option>
        {skills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.label}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        disabled={!skillId}
        loading={pending === "map"}
        icon={<Icon icon={Check} size={16} />}
        onClick={() =>
          run("map", `/api/admin/taxonomy/suggestions/${suggestionId}/map`, {
            skillId,
          })
        }
      >
        {t("map")}
      </Button>
      <Button
        variant="ghost"
        loading={pending === "reject"}
        onClick={() =>
          run(
            "reject",
            `/api/admin/taxonomy/suggestions/${suggestionId}/reject`,
          )
        }
      >
        {t("reject")}
      </Button>
    </div>
  );
}

export function QueueDecision({ itemId }: { itemId: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useAction();
  const [note, setNote] = useState("");
  const noteId = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor={noteId} className="sr-only">
        {t("decisionNote")}
      </label>
      <Input
        id={noteId}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("decisionNote")}
        maxLength={1000}
        className="sm:w-56"
      />
      <div className="flex gap-2">
        <Button
          loading={pending === "approve"}
          icon={<Icon icon={Check} size={16} />}
          onClick={() =>
            run("approve", `/api/admin/queue/${itemId}/decide`, {
              decision: "approved",
              ...(note.trim() ? { note } : {}),
            })
          }
        >
          {t("approve")}
        </Button>
        <Button
          variant="danger"
          disabled={!note.trim()}
          loading={pending === "reject"}
          icon={<Icon icon={X} size={16} />}
          onClick={() =>
            run("reject", `/api/admin/queue/${itemId}/decide`, {
              decision: "rejected",
              note,
            })
          }
        >
          {t("reject")}
        </Button>
      </div>
    </div>
  );
}

export function RemoveJobAction({ jobId }: { jobId: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useAction();
  const [reason, setReason] = useState("");
  const reasonId = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor={reasonId} className="sr-only">
        {t("removeReason")}
      </label>
      <Input
        id={reasonId}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t("removeReason")}
        maxLength={500}
        className="sm:w-48"
      />
      <Button
        variant="danger"
        disabled={reason.trim().length < 3}
        loading={pending === "remove"}
        icon={<Icon icon={Trash2} size={16} />}
        onClick={() =>
          run("remove", `/api/admin/jobs/${jobId}/remove`, { reason })
        }
      >
        {t("remove")}
      </Button>
    </div>
  );
}

export function ReportDecision({ reportId }: { reportId: string }) {
  const t = useTranslations("admin");
  const { pending, run } = useAction();
  return (
    <div className="flex gap-2">
      <Button
        variant="danger"
        loading={pending === "confirm"}
        icon={<Icon icon={Check} size={16} />}
        onClick={() =>
          run("confirm", `/api/admin/reports/${reportId}/decide`, {
            decision: "confirmed",
          })
        }
      >
        {t("confirmReport")}
      </Button>
      <Button
        variant="secondary"
        loading={pending === "dismiss"}
        icon={<Icon icon={X} size={16} />}
        onClick={() =>
          run("dismiss", `/api/admin/reports/${reportId}/decide`, {
            decision: "dismissed",
          })
        }
      >
        {t("dismissReport")}
      </Button>
    </div>
  );
}
