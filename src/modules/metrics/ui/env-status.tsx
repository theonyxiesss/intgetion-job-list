import { getTranslations } from "next-intl/server";
import { StatusDot, Table, Td, Th, Tr } from "@/components/ui";
import type { EnvCheck } from "../service/env-status";

const tones = { ok: "success", warning: "warning", missing: "danger" } as const;

/** Production settings at a glance (D229): names and modes, never values. */
export async function EnvStatusView({ checks }: { checks: EnvCheck[] }) {
  const t = await getTranslations("metrics.env");
  return (
    <section
      aria-labelledby="env-title"
      className="flex flex-col gap-2 border-t border-line pt-6"
    >
      <h2 id="env-title" className="t-h2">
        {t("title")}
      </h2>
      <p className="t-body-s max-w-[70ch] text-fg-muted">{t("note")}</p>
      <Table>
        <thead>
          <Tr>
            <Th>{t("setting")}</Th>
            <Th>{t("state")}</Th>
            <Th>{t("detail")}</Th>
          </Tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <Tr key={check.key}>
              <Td>{t(`keys.${check.key}`)}</Td>
              <Td>
                <span className="inline-flex items-center gap-2">
                  <StatusDot tone={tones[check.state]} />
                  {t(`states.${check.state}`)}
                </span>
              </Td>
              <Td className="t-data">
                {check.detail
                  ? t.has(`details.${check.detail.split(":")[0]}`)
                    ? t(`details.${check.detail.split(":")[0]}`, {
                        value: check.detail,
                      })
                    : check.detail
                  : "—"}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
