"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { elapsedLabel, stepForTool } from "./thinking-status";

/**
 * The live line under the conversation while Spoki works (D490): a pulsing
 * spark, the step in English with a light sweeping over it, and the seconds
 * so far. Idle text stays neutral; only a running tool names a step.
 * Screen readers hear tool changes, not the elapsed-time counter.
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

  const step = tool ? stepForTool(tool) : "thinking";
  const seconds = elapsedLabel(elapsed);
  return (
    <div className="t-body-s flex items-center gap-2" data-thinking>
      <span aria-hidden="true" className="spoki-spark text-[15px] leading-none">
        ✦
      </span>
      <span aria-hidden="true" key={step} className="spoki-shimmer">
        {t(step)}…
      </span>
      {seconds && (
        <span aria-hidden="true" className="t-data text-fg-muted tabular-nums">
          {seconds}
        </span>
      )}
      <span role="status" className="sr-only">
        {t(tool ? stepForTool(tool) : "thinking")}…
      </span>
    </div>
  );
}
