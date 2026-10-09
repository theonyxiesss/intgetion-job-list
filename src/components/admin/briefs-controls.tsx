"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";

const TIMES = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, "0");
  const minutes = String((index % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

async function send(path: string, method: string, body: unknown) {
  return fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
}

/** The global pause (D369). */
export function BriefsPauseSwitch({ paused }: { paused: boolean }) {
  const t = useTranslations("admin.briefs");
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(paused);
  async function toggle(next: boolean) {
    setOn(next);
    const response = await send("/api/admin/briefs/settings", "PUT", {
      paused: next,
    });
    if (!response?.ok) {
      setOn(!next);
      toast.show(t("failed"), "danger");
      return;
    }
    router.refresh();
  }
  return (
    <Switch
      label={t("pause")}
      checked={on}
      onChange={(event) => toggle(event.target.checked)}
    />
  );
}

/** One slot: zone, time on a 15-minute step, on/pause, save and run now. */
export function BriefSlotForm({
  slot,
}: {
  slot: { id: string; timezone: string; localTime: string; enabled: boolean };
}) {
  const t = useTranslations("admin.briefs");
  const router = useRouter();
  const toast = useToast();
  const [timezone, setTimezone] = useState(slot.timezone);
  const [localTime, setLocalTime] = useState(slot.localTime);
  const [enabled, setEnabled] = useState(slot.enabled);
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function save() {
    setPending("save");
    const response = await send(`/api/admin/briefs/slots/${slot.id}`, "PATCH", {
      timezone: timezone.trim(),
      localTime,
      enabled,
    });
    setPending(null);
    if (!response?.ok) {
      toast.show(t("invalid"), "danger");
      return;
    }
    router.refresh();
  }

  async function run(dryRun: boolean) {
    if (!dryRun && !window.confirm(t("confirmLive"))) return;
    setPending(dryRun ? "dry" : "live");
    const response = await send(
      `/api/admin/briefs/slots/${slot.id}/run`,
      "POST",
      { dryRun },
    );
    setPending(null);
    if (response?.status === 409) {
      toast.show(t("alreadyRan"), "danger");
      return;
    }
    if (!response?.ok) {
      toast.show(t("failed"), "danger");
      return;
    }
    const body = (await response.json()) as {
      run: { sent: number; empty: number; failed: number };
    };
    setNote(
      t("runResult", {
        sent: body.run.sent,
        empty: body.run.empty,
        failed: body.run.failed,
      }),
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="t-label text-fg-muted">{t("timezone")}</span>
          <Input
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="w-56"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-label text-fg-muted">{t("time")}</span>
          <Select
            value={localTime}
            onChange={(event) => setLocalTime(event.target.value)}
          >
            {TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </label>
        <Switch
          label={t("enabled")}
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <Button
          variant="secondary"
          loading={pending === "save"}
          onClick={save}
        >
          {t("save")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          loading={pending === "dry"}
          onClick={() => run(true)}
        >
          {t("runDry")}
        </Button>
        <Button
          variant="danger"
          loading={pending === "live"}
          onClick={() => run(false)}
        >
          {t("runLive")}
        </Button>
      </div>
      {note ? (
        <p role="status" className="text-fg-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}
