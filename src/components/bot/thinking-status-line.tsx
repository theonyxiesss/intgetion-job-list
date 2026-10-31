"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { elapsedLabel, idleStep, stepForTool } from "./thinking-status";

/**
 * Compact live status with a rotating idle label, active tool, and elapsed time.
 * It reports observed activity, never model reasoning.
 */
export function ThinkingStatusLine({ tool }: { tool: string | null }) {
  const t = useTranslations("chat.status");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(
      () => setElapsed(performance.now() - start),
      250,
    );
    return () => window.clearInterval(timer);
  }, []);

  const step = tool ? stepForTool(tool) : idleStep(elapsed);
  const seconds = elapsedLabel(elapsed);
  return (
    <div
      className="t-body-s flex min-h-11 items-center gap-3 border-l-2 border-signal pl-3"
      data-thinking
      aria-busy="true"
    >
      <span aria-hidden="true" key={step} className="spoki-shimmer">
        {t(step)}…
      </span>
      <span aria-hidden="true" className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1">
          <span className="size-1 rounded-full bg-signal motion-safe:animate-pulse" />
          <span className="size-1 rounded-full bg-signal [animation-delay:150ms] motion-safe:animate-pulse" />
          <span className="size-1 rounded-full bg-signal [animation-delay:300ms] motion-safe:animate-pulse" />
        </span>
        {seconds && (
          <span className="t-data text-fg-muted tabular-nums">{seconds}</span>
        )}
      </span>
      <span role="status" className="sr-only">
        {t(tool ? stepForTool(tool) : "thinking")}…
      </span>
    </div>
  );
}
