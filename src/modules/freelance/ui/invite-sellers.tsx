"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type InviteCard = {
  sellerId: string;
  name: string;
  headline: string | null;
  badge: string | null;
  facts: string[];
  invited: boolean;
  proposed: boolean;
};

export type InviteLabels = {
  title: string;
  none: string;
  button: string;
  invited: string;
  proposed: string;
  note: string;
  error: string;
};

/** Suggested freelancers for an open task, each with one invite button (A4). */
export function InviteSellers({
  taskId,
  cards,
  labels,
}: {
  taskId: string;
  cards: readonly InviteCard[];
  labels: InviteLabels;
}) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function invite(sellerId: string) {
    setBusy(sellerId);
    setError("");
    const response = await fetch(`/api/freelance/tasks/${taskId}/invite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sellerId }),
    }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      setError(labels.error);
      return;
    }
    setDone(new Set([...done, sellerId]));
  }

  return (
    <section
      aria-labelledby={`invite-${taskId}`}
      className="mt-6 flex flex-col gap-3"
    >
      <h2 id={`invite-${taskId}`} className="t-h3">
        {labels.title}
      </h2>
      {cards.length === 0 ? (
        <p className="text-sm text-fg-muted">{labels.none}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {cards.map((card) => {
            const invited = card.invited || done.has(card.sellerId);
            return (
              <li
                key={card.sellerId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium break-words">
                    {card.name}
                    {card.badge ? (
                      <span className="t-body-s ml-2 font-normal text-fg-muted">
                        {card.badge}
                      </span>
                    ) : null}
                  </p>
                  {card.headline ? (
                    <p className="t-body-s break-words text-fg-muted">
                      {card.headline}
                    </p>
                  ) : null}
                  {card.facts.length ? (
                    <p className="t-body-s font-mono">
                      {card.facts.join(" · ")}
                    </p>
                  ) : null}
                </div>
                {card.proposed ? (
                  <span className="t-body-s">{labels.proposed}</span>
                ) : invited ? (
                  <span role="status" className="t-body-s">
                    {labels.invited}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy === card.sellerId}
                    aria-busy={busy === card.sellerId}
                    onClick={() => void invite(card.sellerId)}
                  >
                    {labels.button}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="t-body-s text-fg-muted">{labels.note}</p>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
