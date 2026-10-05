"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";

async function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function PeopleActions({
  userId,
  status,
  myId,
  canSuspend,
  canBan,
  canDelete,
  canSignOut,
  canReset,
  canNote,
  canReveal,
  approvals,
}: {
  userId: string;
  status: string;
  myId: string;
  canSuspend: boolean;
  canBan: boolean;
  canDelete: boolean;
  canSignOut: boolean;
  canReset: boolean;
  canNote: boolean;
  canReveal: boolean;
  approvals: { id: string; action: string; requestedBy: string }[];
}) {
  const t = useTranslations("admin");
  const toast = useToast();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, path: string, body: unknown) {
    setPending(key);
    const response = await post(path, body).catch(() => null);
    setPending(null);
    if (!response?.ok) {
      toast.show(t("actionFailed"), "danger");
      return null;
    }
    router.refresh();
    return response.json();
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="t-label text-fg-muted">{t("reasonLabel")}</span>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("reasonPlaceholder")}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {canSuspend && status === "active" && (
          <Button
            variant="danger"
            loading={pending === "suspend"}
            onClick={() =>
              run("suspend", `/api/admin/users/${userId}/suspend`, {
                note: reason,
              })
            }
          >
            {t("suspend")}
          </Button>
        )}
        {canSuspend && status === "suspended" && (
          <Button
            variant="secondary"
            loading={pending === "unsuspend"}
            onClick={() =>
              run("unsuspend", `/api/admin/users/${userId}/unsuspend`, {
                note: reason,
              })
            }
          >
            {t("unsuspend")}
          </Button>
        )}
        {canBan && status !== "banned" && status !== "deleted" && (
          <Button
            variant="danger"
            loading={pending === "ban"}
            onClick={() =>
              run("ban", `/api/admin/users/${userId}/ban`, { reason })
            }
          >
            {t("ban")}
          </Button>
        )}
        {canDelete && status !== "deleted" && (
          <Button
            variant="danger"
            loading={pending === "delete"}
            onClick={() =>
              run("delete", `/api/admin/users/${userId}/delete`, { reason })
            }
          >
            {t("deleteAccount")}
          </Button>
        )}
        {canSignOut && (
          <Button
            variant="secondary"
            loading={pending === "signout"}
            onClick={() =>
              run("signout", `/api/admin/users/${userId}/signout`, { reason })
            }
          >
            {t("signOutAll")}
          </Button>
        )}
        {canReset && (
          <Button
            variant="secondary"
            loading={pending === "reset"}
            onClick={() =>
              run("reset", `/api/admin/users/${userId}/reset-password`, {
                reason,
              })
            }
          >
            {t("resetPassword")}
          </Button>
        )}
        {canReveal && (
          <Button
            variant="secondary"
            loading={pending === "reveal"}
            onClick={async () => {
              const body = (await run(
                "reveal",
                `/api/admin/users/${userId}/reveal`,
                { reason },
              )) as {
                email?: string | null;
                phone?: string | null;
                telegram?: string | null;
              } | null;
              if (!body) return;
              setRevealed(
                [body.email, body.phone, body.telegram]
                  .filter(Boolean)
                  .join(" · ") || t("noPii"),
              );
            }}
          >
            {t("showPii")}
          </Button>
        )}
      </div>
      {revealed && <p className="t-body-s">{revealed}</p>}
      {canNote && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="t-label text-fg-muted">{t("addNote")}</span>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            loading={pending === "note"}
            onClick={() =>
              run("note", `/api/admin/users/${userId}/notes`, { body: note })
            }
          >
            {t("addNote")}
          </Button>
        </div>
      )}
      {approvals.map((approval) => {
        const allowed = approval.action === "users.ban" ? canBan : canDelete;
        if (!allowed) return null;
        return approval.requestedBy === myId ? (
          <p key={approval.id} className="t-body-s text-fg-muted">
            {t("waitingSecond")}
          </p>
        ) : (
          <div key={approval.id} className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              loading={pending === approval.id}
              onClick={() =>
                run(approval.id, `/api/admin/approvals/${approval.id}`, {
                  decision: "approved",
                })
              }
            >
              {t("approve")}
            </Button>
            <Button
              variant="secondary"
              loading={pending === `${approval.id}-no`}
              onClick={() =>
                run(
                  `${approval.id}-no`,
                  `/api/admin/approvals/${approval.id}`,
                  {
                    decision: "rejected",
                  },
                )
              }
            >
              {t("rejectRequest")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
