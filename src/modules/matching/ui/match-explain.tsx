import {
  Check,
  CircleMinus,
  CircleX,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/cn";
import type { ExplainEntry, ExplainVerdict } from "../service";

const verdictIcon: Record<ExplainVerdict, LucideIcon> = {
  matched: Check,
  partial: CircleMinus,
  neutral: Minus,
  failed: CircleX,
};
const verdictTone: Record<ExplainVerdict, string> = {
  matched: "text-success",
  partial: "text-warning",
  neutral: "text-fg-subtle",
  failed: "text-danger",
};

/** Explain (10.7): up to `limit` entries, already in verdict order. */
export async function MatchExplain({
  entries,
  limit = 4,
  className,
}: {
  entries: readonly ExplainEntry[];
  limit?: number;
  className?: string;
}) {
  const t = await getTranslations();
  const shown = entries.slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {shown.map((entry) => (
        <li
          key={entry.criterion}
          className="t-body-s flex items-start gap-2 text-fg-muted"
        >
          <span className={cn("mt-0.5 shrink-0", verdictTone[entry.verdict])}>
            <Icon icon={verdictIcon[entry.verdict]} size={16} />
          </span>
          <span>
            {t(
              entry.detail.key as Parameters<typeof t>[0],
              entry.detail.params,
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
