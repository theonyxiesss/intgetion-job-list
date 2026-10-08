"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type Person = {
  userId: string;
  role: "owner" | "admin" | "recruiter" | "member";
  label: string;
};

type TeamSeatsProps = {
  companyId: string;
  people: Person[];
  cap: number;
  text: {
    heading: string;
    count: string;
    email: string;
    add: string;
    added: string;
    remove: string;
    removed: string;
    full: string;
    missing: string;
    already: string;
    error: string;
    upgrade: string;
    atTeamCap: string;
  };
};

export function TeamSeats({ companyId, people, cap, text }: TeamSeatsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const full = people.length >= cap;

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/companies/${companyId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      if (response.ok) {
        const body = (await response.json()) as { result?: string };
        toast.show(body.result === "already" ? text.already : text.added);
        if (body.result !== "already") window.location.reload();
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      const code = body?.error?.code;
      if (code === "SEAT_LIMIT") toast.show(text.full, "danger");
      else if (code === "NO_ACCOUNT") toast.show(text.missing, "danger");
      else toast.show(text.error, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/members/${userId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        toast.show(text.error, "danger");
        return;
      }
      toast.show(text.removed);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex max-w-[720px] flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-h3">{text.heading}</h2>
        <p className="t-body text-fg-muted">{text.count}</p>
      </header>
      <ul className="flex flex-col gap-2">
        {people.map((person) => (
          <li
            key={person.userId}
            className="flex items-center justify-between gap-3"
          >
            <span className="t-body">{person.label}</span>
            {person.role === "owner" ? null : (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => remove(person.userId)}
              >
                {text.remove}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {full ? (
        <p className="t-body text-fg-muted">
          {cap >= 10 ? (
            text.atTeamCap
          ) : (
            <Link href="/pricing" className="underline underline-offset-4">
              {text.upgrade}
            </Link>
          )}
        </p>
      ) : (
        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={add}>
          <Field label={text.email} className="flex-1">
            <Input type="email" name="email" required maxLength={200} />
          </Field>
          <Button type="submit" disabled={busy}>
            {text.add}
          </Button>
        </form>
      )}
    </section>
  );
}
