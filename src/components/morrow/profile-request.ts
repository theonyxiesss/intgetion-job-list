import type { HandedFile } from "@/components/bot/spoki-ask";

/** What the window keeps until Spoki saves it after sign-in. */
export type ProfileDraft = {
  name: string;
  role: string;
  skills: string;
  location: string;
  portfolio: string;
  /** The CV's text, read before sign-in so it survives the page reload. */
  cv: HandedFile | null;
};

/** One message to Spoki with what the person typed; its card saves it. */
export function profileRequest(
  draft: ProfileDraft,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  const parts = (
    ["name", "role", "skills", "location", "portfolio"] as const
  ).flatMap((key) => {
    const value = draft[key].trim();
    return value ? [t(`line.${key}`, { value })] : [];
  });
  return t("request", { facts: parts.join("; ") });
}
