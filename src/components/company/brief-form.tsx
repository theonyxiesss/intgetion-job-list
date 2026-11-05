"use client";

import { useState, type FormEvent } from "react";
import { handSpokiAsk } from "@/components/bot/spoki-ask";
import { useSpoki } from "@/components/bot/spoki-context";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ServiceIcon } from "@/components/ui/service-icon";
import { useRouter } from "@/i18n/navigation";
import { parseEngagementBrief } from "@/modules/companies/engagement-brief";

export type BriefFormCopy = {
  title: string;
  lead: string;
  task: string;
  taskHint: string;
  taskPlaceholder: string;
  reply: string;
  replyHint: string;
  org: string;
  send: string;
  sending: string;
  doneTitle: string;
  done: string;
  error: string;
  taskShort: string;
  taskLong: string;
  replyBad: string;
  orgLong: string;
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
  steps: { goal: string; brief: string; review: string };
  goalTitle: string;
  goalLead: string;
  goals: { id: string; title: string; hint: string }[];
  goalRequired: string;
  directionsTitle: string;
  directionsHint: string;
  spokiTitle: string;
  spokiName: string;
  spokiQuestion: string;
  spokiHint: string;
  reviewTitle: string;
  reviewLead: string;
  goalLabel: string;
  directionsLabel: string;
  taskLabel: string;
  organizationLabel: string;
  budgetLabel: string;
  durationLabel: string;
  startLabel: string;
  replyLabel: string;
  unspecified: string;
  anyDirection: string;
  continue: string;
  back: string;
  review: string;
  editBrief: string;
  discuss: string;
  chatHandoff: string;
};

type BriefStep = "goal" | "brief" | "review";

function composeTask(
  goal: string,
  directions: string[],
  task: string,
  copy: BriefFormCopy,
) {
  return [
    `${copy.goalLabel}: ${goal}`,
    directions.length
      ? `${copy.directionsLabel}: ${directions.join(", ")}`
      : null,
    `${copy.taskLabel}: ${task.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function BriefForm({
  copy,
  directionGroups,
}: {
  copy: BriefFormCopy;
  directionGroups: string[];
}) {
  const spoki = useSpoki();
  const router = useRouter();
  const [step, setStep] = useState<BriefStep>("goal");
  const [goal, setGoal] = useState("");
  const [directions, setDirections] = useState<string[]>([]);
  const [task, setTask] = useState("");
  const [reviewTask, setReviewTask] = useState("");
  const [reply, setReply] = useState("");
  const [organization, setOrganization] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [start, setStart] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldError, setFieldError] = useState<
    "task" | "reply" | "organization" | "budget" | "duration" | "start" | null
  >(null);
  const [goalError, setGoalError] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedGoal = copy.goals.find((item) => item.id === goal)?.title ?? "";

  function toggleDirection(direction: string) {
    setDirections((current) =>
      current.includes(direction)
        ? current.filter((item) => item !== direction)
        : [...current, direction],
    );
  }

  function continueToBrief() {
    if (!goal && directions.length === 0) {
      setGoalError(true);
      return;
    }
    setGoalError(false);
    setStep("brief");
  }

  function continueToReview() {
    if (task.trim().length < 20) {
      setFieldError("task");
      return;
    }
    const serializedTask = composeTask(
      selectedGoal || copy.anyDirection,
      directions,
      task,
      copy,
    );
    const parsed = parseEngagementBrief({
      task: serializedTask,
      reply,
      organization,
      budget,
      duration,
      start,
    });
    if (!parsed.ok) {
      setFieldError(parsed.field);
      return;
    }
    setFieldError(null);
    setFailed(false);
    setReviewTask(task);
    setStep("review");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(false);
    if (reviewTask.trim().length < 20) {
      setFieldError("task");
      setTask(reviewTask);
      setStep("brief");
      return;
    }
    const serializedTask = composeTask(
      selectedGoal || copy.anyDirection,
      directions,
      reviewTask,
      copy,
    );
    const parsed = parseEngagementBrief({
      task: serializedTask,
      reply,
      organization,
      budget,
      duration,
      start,
    });
    if (!parsed.ok) {
      setFieldError(parsed.field);
      setTask(reviewTask);
      setStep("brief");
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
          field === "organization" ||
          field === "budget" ||
          field === "duration" ||
          field === "start"
        ) {
          setFieldError(field);
          setTask(reviewTask);
          setStep("brief");
        } else setFailed(true);
        return;
      }

      // Only the project request goes to Spoki; contact details stay in the brief.
      const chatMessage = `${copy.chatHandoff}\n\n${serializedTask}`;
      if (spoki) {
        spoki.open({ from: "services" });
        // Let the dock switch and remount the services thread before notifying it.
        window.setTimeout(() => handSpokiAsk(chatMessage), 0);
      } else {
        handSpokiAsk(chatMessage);
        router.push({ pathname: "/chat", query: { from: "services" } });
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
      <div className="flex max-w-[60ch] flex-col gap-4" role="status">
        <h3 className="t-h3">{copy.doneTitle}</h3>
        <p className="text-fg-muted">{copy.done}</p>
      </div>
    );
  }

  const stepItems: { id: BriefStep; label: string }[] = [
    { id: "goal", label: copy.steps.goal },
    { id: "brief", label: copy.steps.brief },
    { id: "review", label: copy.steps.review },
  ];

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <h3 className="t-h3">{copy.title}</h3>
        <p className="text-fg-muted">{copy.lead}</p>
      </div>
      <ol
        aria-label={copy.title}
        className="grid grid-cols-3 border-b border-line pb-3 text-sm text-fg-muted"
      >
        {stepItems.map((item, index) => (
          <li
            key={item.id}
            aria-current={step === item.id ? "step" : undefined}
            className={step === item.id ? "font-medium text-fg" : ""}
          >
            <span className="mr-2 font-mono text-xs">{index + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>

      {step === "goal" ? (
        <section
          className="flex flex-col gap-5"
          aria-labelledby="brief-goal-title"
        >
          <div>
            <h3 id="brief-goal-title" className="t-h3">
              {copy.goalTitle}
            </h3>
            <p className="mt-2 text-fg-muted">{copy.goalLead}</p>
          </div>
          <div
            role="group"
            aria-label={copy.goalTitle}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {copy.goals.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="secondary"
                aria-pressed={goal === item.id}
                onClick={() => {
                  setGoal(item.id);
                  setGoalError(false);
                }}
                className="h-auto min-h-18 w-full flex-col items-start justify-center rounded-lg px-4 py-3 text-left whitespace-normal aria-pressed:border-accent aria-pressed:bg-surface-2"
              >
                <span className="font-medium">{item.title}</span>
                <span className="text-sm text-fg-muted">{item.hint}</span>
              </Button>
            ))}
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="t-label text-fg-muted">
              {copy.directionsTitle}
            </legend>
            <p className="text-sm text-fg-muted">{copy.directionsHint}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {directionGroups.map((direction) => (
                <label
                  key={direction}
                  className="flex min-h-11 cursor-pointer items-start gap-3 border border-line-strong px-3 py-3 transition-colors hover:bg-surface-2 has-[:checked]:border-accent"
                >
                  <input
                    type="checkbox"
                    checked={directions.includes(direction)}
                    onChange={() => toggleDirection(direction)}
                    className="mt-1 size-4 accent-accent"
                  />
                  <span>{direction}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {goalError ? (
            <p className="text-sm text-danger" role="alert">
              {copy.goalRequired}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" onClick={continueToBrief}>
              {copy.continue} <span aria-hidden="true">→</span>
            </Button>
          </div>
        </section>
      ) : null}

      {step === "brief" ? (
        <section
          className="flex flex-col gap-5"
          aria-labelledby="brief-task-title"
        >
          <div>
            <h3 id="brief-task-title" className="t-h3">
              {copy.spokiTitle}
            </h3>
            <div className="mt-4 flex gap-3 border border-line bg-surface-2 p-4">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-accent"
              >
                <ServiceIcon name="spoki" size={18} />
              </span>
              <div className="flex flex-col gap-1">
                <strong>{copy.spokiName}</strong>
                <p>{copy.spokiQuestion}</p>
                {selectedGoal ? (
                  <p className="text-sm text-fg-muted">
                    {copy.goalLabel}: {selectedGoal}
                  </p>
                ) : null}
                <p className="text-sm text-fg-muted">{copy.spokiHint}</p>
              </div>
            </div>
          </div>
          <Field
            label={copy.task}
            help={copy.taskHint}
            error={
              fieldError === "task"
                ? task.trim().length < 20
                  ? copy.taskShort
                  : copy.taskLong
                : null
            }
            required
          >
            <Textarea
              name="task"
              required
              minLength={20}
              maxLength={3400}
              placeholder={copy.taskPlaceholder}
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
          <Field
            label={copy.org}
            error={fieldError === "organization" ? copy.orgLong : null}
          >
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
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("goal")}
            >
              {copy.back}
            </Button>
            <Button type="button" onClick={continueToReview}>
              {copy.review} <span aria-hidden="true">→</span>
            </Button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section
          className="flex flex-col gap-5"
          aria-labelledby="brief-review-title"
        >
          <div>
            <h3 id="brief-review-title" className="t-h3">
              {copy.reviewTitle}
            </h3>
            <p className="mt-2 text-fg-muted">{copy.reviewLead}</p>
          </div>
          <dl className="grid gap-0 border-t border-line">
            <div className="grid gap-2 border-b border-line py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="t-label text-fg-muted">{copy.goalLabel}</dt>
              <dd>{selectedGoal || copy.anyDirection}</dd>
            </div>
            <div className="grid gap-2 border-b border-line py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="t-label text-fg-muted">{copy.directionsLabel}</dt>
              <dd>{directions.join(", ") || copy.anyDirection}</dd>
            </div>
          </dl>
          <Field
            label={copy.taskLabel}
            help={copy.taskHint}
            error={fieldError === "task" ? copy.taskLong : null}
            required
          >
            <Textarea
              name="reviewTask"
              required
              minLength={20}
              maxLength={3400}
              value={reviewTask}
              onChange={(event) => setReviewTask(event.target.value)}
            />
          </Field>
          <dl className="grid gap-0 border-t border-line">
            {[
              [copy.organizationLabel, organization],
              [copy.budgetLabel, budget],
              [copy.durationLabel, duration],
              [copy.startLabel, start],
              [copy.replyLabel, reply],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-line py-3 sm:grid-cols-[10rem_1fr]"
              >
                <dt className="t-label text-fg-muted">{label}</dt>
                <dd className="break-words">{value || copy.unspecified}</dd>
              </div>
            ))}
          </dl>
          {failed ? (
            <p className="text-danger" role="alert">
              {copy.error}
            </p>
          ) : null}
          <p className="text-sm text-fg-muted">{copy.spokiHint}</p>
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTask(reviewTask);
                setStep("brief");
              }}
            >
              {copy.editBrief}
            </Button>
            <Button
              type="submit"
              loading={sending}
              onMouseEnter={spoki?.preload}
              onFocus={spoki?.preload}
            >
              {sending ? copy.sending : copy.discuss}
            </Button>
          </div>
        </section>
      ) : null}
    </form>
  );
}
