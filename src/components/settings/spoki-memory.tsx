"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmCard } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export type MemoryFactView = {
  id: string;
  fact: string;
  source: "chat" | "site";
};

type Result =
  { ok: true; body: unknown } | { ok: false; code: string | undefined };

async function call(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  if (!response) return { ok: false, code: undefined } satisfies Result;
  const json: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return { ok: true, body: json } satisfies Result;
  const code = (json as { error?: { code?: string } } | null)?.error?.code;
  return { ok: false, code } satisfies Result;
}

/** What Spoki remembers (D469): read, correct, erase, or add a fact. */
export function SpokiMemory({
  initial,
  max,
  maxChars,
}: {
  initial: MemoryFactView[];
  max: number;
  maxChars: number;
}) {
  const t = useTranslations("spokiMemory");
  const toast = useToast();
  const [facts, setFacts] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  function failure(code: string | undefined) {
    const text =
      code === "MEMORY_CONTACTS"
        ? t("errorContacts")
        : code === "MEMORY_SECRET"
          ? t("errorSecret")
          : code === "MEMORY_FULL"
            ? t("errorFull")
            : t("failed");
    toast.show(text, "danger");
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    const result = await call("/api/bot/memory", "POST", { fact: draft });
    setBusy(false);
    if (!result.ok) return failure(result.code);
    const fact = (result.body as { fact: MemoryFactView }).fact;
    setFacts((current) =>
      current.some((item) => item.id === fact.id)
        ? current
        : [...current, fact],
    );
    setDraft("");
    toast.show(t("saved"));
  }

  async function save() {
    if (!editing || !editing.text.trim()) return;
    setBusy(true);
    const result = await call(`/api/bot/memory/${editing.id}`, "PATCH", {
      fact: editing.text,
    });
    setBusy(false);
    if (!result.ok) return failure(result.code);
    const fact = (result.body as { fact: MemoryFactView }).fact;
    setFacts((current) =>
      current.map((item) => (item.id === fact.id ? fact : item)),
    );
    setEditing(null);
    toast.show(t("saved"));
  }

  async function erase(id: string) {
    setBusy(true);
    const result = await call(`/api/bot/memory/${id}`, "DELETE");
    setBusy(false);
    if (!result.ok) return failure(result.code);
    setFacts((current) => current.filter((item) => item.id !== id));
    toast.show(t("deleted"));
  }

  async function eraseAll() {
    setBusy(true);
    const result = await call("/api/bot/memory", "DELETE");
    setBusy(false);
    setConfirmAll(false);
    if (!result.ok) return failure(result.code);
    setFacts([]);
    toast.show(t("deleted"));
  }

  return (
    <section
      id="memory"
      aria-labelledby="memory-title"
      className="flex scroll-mt-24 flex-col gap-4 border border-line p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="memory-title" className="t-h3">
          {t("title")}
        </h2>
        <span className="font-mono text-sm text-fg-muted">
          {t("count", { count: facts.length, max })}
        </span>
      </div>
      <p className="t-body-s max-w-[60ch] text-fg-muted">{t("text")}</p>
      {facts.length === 0 ? (
        <p className="t-body-s text-fg-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {facts.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-line py-3"
            >
              {editing?.id === item.id ? (
                <div className="flex w-full flex-col gap-2">
                  <Field label={t("editLabel")}>
                    <Input
                      value={editing.text}
                      maxLength={maxChars}
                      onChange={(event) =>
                        setEditing({ id: item.id, text: event.target.value })
                      }
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={save}
                      disabled={busy || !editing.text.trim()}
                    >
                      {t("save")}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <p>{item.fact}</p>
                    <p className="t-body-s text-fg-muted">
                      {item.source === "site" ? t("fromSite") : t("fromChat")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("editLabel")}
                      disabled={busy}
                      onClick={() =>
                        setEditing({ id: item.id, text: item.fact })
                      }
                    >
                      <Icon icon={Pencil} size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("deleteLabel")}
                      disabled={busy}
                      onClick={() => erase(item.id)}
                    >
                      <Icon icon={Trash2} size={16} />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {facts.length < max && (
        <form onSubmit={add} className="flex flex-col gap-2">
          <Field label={t("addLabel")}>
            <Input
              value={draft}
              maxLength={maxChars}
              placeholder={t("placeholder")}
              onChange={(event) => setDraft(event.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            className="self-start"
            disabled={busy || !draft.trim()}
          >
            {t("add")}
          </Button>
        </form>
      )}
      {facts.length > 0 &&
        (confirmAll ? (
          <ConfirmCard
            title={t("deleteAllTitle")}
            confirmLabel={t("deleteAll")}
            cancelLabel={t("cancel")}
            onConfirm={eraseAll}
            onCancel={() => setConfirmAll(false)}
            loading={busy}
            danger
          >
            {t("deleteAllText")}
          </ConfirmCard>
        ) : (
          <Button
            variant="danger"
            className="self-start"
            disabled={busy}
            onClick={() => setConfirmAll(true)}
          >
            {t("deleteAll")}
          </Button>
        ))}
    </section>
  );
}
