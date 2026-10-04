import { Check, Circle, Minus, X, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import type {
  ExplainEntry,
  ExplainVerdict,
} from "@/modules/matching/score/types";

const verdictIcon: Record<ExplainVerdict, LucideIcon> = {
  matched: Check,
  partial: Minus,
  neutral: Circle,
  failed: X,
};

const verdictClass: Record<ExplainVerdict, string> = {
  matched: "text-success",
  partial: "text-warning",
  neutral: "text-fg-muted",
  failed: "text-danger",
};

/** Up to four explain lines (10.7). Keys already live under `explain.*`. */
export async function ExplainLines({
  entries,
}: {
  entries: readonly ExplainEntry[];
}) {
  const t = await getTranslations("explain");
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {entries.slice(0, 4).map((entry) => {
        const path = entry.detail.key.replace(/^explain\./, "");
        return (
          <li
            key={entry.detail.key}
            className="t-body-s flex items-start gap-2"
          >
            <span className={verdictClass[entry.verdict]}>
              <Icon icon={verdictIcon[entry.verdict]} size={16} />
            </span>
            <span>{t(path as "skills.matched", entry.detail.params)}</span>
          </li>
        );
      })}
    </ul>
  );
}
