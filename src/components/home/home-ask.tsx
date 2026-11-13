"use client";

import { ServiceIcon } from "@/components/ui/service-icon";

import { ArrowUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSpoki } from "@/components/bot/spoki-context";
import { handSpokiAsk } from "@/components/bot/spoki-ask";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "@/i18n/navigation";

/**
 * The home page field for Spoki (D601). The text goes to the one chat: the
 * panel beside the page, the sheet on a phone, or `/chat` where the panel is
 * off. It never goes into the address. Without JavaScript the form still
 * opens `/chat`, empty.
 */
export function HomeAsk({
  action,
  label,
  placeholder,
  submit,
  examplesLabel,
  examples,
  v2 = false,
}: {
  action: string;
  label: string;
  placeholder: string;
  submit: string;
  examplesLabel: string;
  examples: readonly string[];
  v2?: boolean;
}) {
  const spoki = useSpoki();
  const router = useRouter();
  const [text, setText] = useState("");

  function handOff(message: string) {
    const value = message.trim();
    if (!value) return;
    handSpokiAsk(value);
    setText("");
    if (spoki) spoki.open();
    else router.push("/chat");
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handOff(text);
  }

  return (
    <div
      className={
        v2
          ? "flex w-full max-w-[720px] flex-col items-center"
          : "mt-8 flex w-full max-w-2xl flex-col items-center gap-4"
      }
    >
      <form
        action={action}
        method="get"
        onSubmit={send}
        onMouseEnter={spoki?.preload}
        onFocus={spoki?.preload}
        className={
          v2
            ? "flex w-full items-center gap-3 rounded-[28px] border border-line bg-surface-2 py-2 pr-2 pl-5 has-[#home-ask:focus-visible]:outline-2 has-[#home-ask:focus-visible]:outline-offset-2 has-[#home-ask:focus-visible]:outline-accent"
            : "flex w-full items-center gap-3 rounded-xl border border-line-strong bg-surface py-2 pr-2 pl-4 has-[#home-ask:focus-visible]:outline-2 has-[#home-ask:focus-visible]:outline-offset-2 has-[#home-ask:focus-visible]:outline-accent"
        }
      >
        {!v2 && <ServiceIcon name="spoki" size={28} className="text-signal" />}
        <label className="sr-only" htmlFor="home-ask">
          {label}
        </label>
        <input
          id="home-ask"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="send"
          maxLength={2000}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-left text-[16px] text-fg placeholder:text-fg-subtle focus-visible:outline-none"
        />
        {v2 ? (
          <button
            type="submit"
            aria-label={submit}
            disabled={!text.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-50"
          >
            <Icon icon={ArrowUp} size={20} />
          </button>
        ) : (
          <Button
            type="submit"
            aria-label={submit}
            trailingIcon={<Icon icon={ArrowUp} size={16} />}
          >
            <span className="hidden sm:inline">{submit}</span>
          </Button>
        )}
      </form>
      {!v2 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="t-body-s text-fg-subtle">{examplesLabel}</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handOff(example)}
              onMouseEnter={spoki?.preload}
              className="min-h-11 rounded-full border border-line px-4 text-sm text-fg-muted transition-colors duration-200 hover:border-fg-subtle hover:text-fg"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
