import { getTranslations, setRequestLocale } from "next-intl/server";
import { RouteMessages } from "@/components/shell/route-messages";
import { McpAccess } from "@/components/settings/mcp-access";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsShell } from "../settings-tabs";
import {
  listMcpConnections,
  listMcpPersonalTokens,
  MCP_SCOPES,
} from "@/modules/mcp/service";

export default async function AssistantsSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("mcp");
  const [tokens, connections] = await Promise.all([
    listMcpPersonalTokens(user.id),
    listMcpConnections(user.id),
  ]);
  return (
    <RouteMessages namespaces={["mcp"]}>
      <SettingsShell active="assistants" title={t("settingsTitle")}>
        <McpAccess
          tokens={tokens}
          connections={connections}
          scopes={MCP_SCOPES}
        />
      </SettingsShell>
    </RouteMessages>
  );
}
