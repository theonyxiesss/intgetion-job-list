"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { parseEngagementBrief } from "@/modules/companies/engagement-brief";

export type BriefFormCopy = {
  title: string;
  lead: string;
  task: string;
  taskHint: string;
  reply: string;
  replyHint: string;
  org: string;
  send: string;
  sending: string;
  done: string;
  error: string;
  taskShort: string;
  replyBad: string;
  budget: string;
  budgetHint: string;
  budgetLong: string;
  duration: string;
  durationHint: string;
  durationLong: string;
  start: string;
  startHint: string;
  startLong: string;
  trap: string;
};

export function BriefForm({ copy }: { copy: BriefFormCopy }) {
  const [task, setTask] = useState("");
  const [reply, setReply] = useState("");
  const [organization, setOrganization] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [start, setStart] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldError, setFieldError] = useState<
    "task" | "reply" | "budget" | "duration" | "start" | null
  >(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailed(false);
    const parsed = parseEngagementBrief({
      task,
      reply,
      organization,
      budget,
      duration,
      start,
    });
    if (!parsed.ok) {
      setFieldError(
        parsed.field === "reply" ||
          parsed.field === "budget" ||
          parsed.field === "duration" ||
          parsed.field === "start"
          ? parsed.field
          : "task",
      );
      return;
    }
    setFieldError(null);
    setSending(true);
    try {
      const response = await fetch("/api/company/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task: parsed.task,
          reply: parsed.reply,
          organization: parsed.organization,
          budget: parsed.budget,
          duration: parsed.duration,
          start: parsed.start,
          website,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { details?: { field?: string } };
        } | null;
        const field = payload?.error?.details?.field;
        if (
          field === "task" ||
          field === "reply" ||
          field === "budget" ||
          field === "duration" ||
          field === "start"
        ) {
          setFieldError(field);
        } else setFailed(true);
        return;
      }
      setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="max-w-[60ch]" role="status">
        {copy.done}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      <h3 className="t-h3">{copy.title}</h3>
      <p className="text-fg-muted">{copy.lead}</p>
      <Field
        label={copy.task}
        help={copy.taskHint}
        error={fieldError === "task" ? copy.taskShort : null}
        required
      >
        <Textarea
          name="task"
          required
          minLength={20}
          maxLength={4000}
          value={task}
          onChange={(event) => setTask(event.target.value)}
        />
      </Field>
      <Field
        label={copy.reply}
        help={copy.replyHint}
        error={fieldError === "reply" ? copy.replyBad : null}
        required
      >
        <Input
          name="reply"
          required
          autoComplete="email"
          maxLength={200}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
        />
      </Field>
      <Field
        label={copy.budget}
        help={copy.budgetHint}
        error={fieldError === "budget" ? copy.budgetLong : null}
      >
        <Input
          name="budget"
          maxLength={80}
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
        />
      </Field>
      <Field
        label={copy.duration}
        help={copy.durationHint}
        error={fieldError === "duration" ? copy.durationLong : null}
      >
        <Input
          name="duration"
          maxLength={80}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </Field>
      <Field
        label={copy.start}
        help={copy.startHint}
        error={fieldError === "start" ? copy.startLong : null}
      >
        <Input
          name="start"
          maxLength={80}
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </Field>
      <Field label={copy.org}>
        <Input
          name="organization"
          maxLength={120}
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
        />
      </Field>
      <div hidden>
        <label>
          {copy.trap}
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>
      {failed ? (
        <p className="text-danger" role="alert">
          {copy.error}
        </p>
      ) : null}
      <Button type="submit" disabled={sending}>
        {sending ? copy.sending : copy.send}
      </Button>
    </form>
  );
}
