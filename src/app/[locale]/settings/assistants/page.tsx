import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui";
import { RouteMessages } from "@/components/shell/route-messages";
import { McpAccess } from "@/components/settings/mcp-access";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsTabs } from "../settings-tabs";
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
      <main className="py-10 md:py-16">
        <Container narrow className="flex flex-col gap-8">
          <PageHeader title={t("settingsTitle")} />
          <SettingsTabs active="assistants" />
          <McpAccess
            tokens={tokens}
            connections={connections}
            scopes={MCP_SCOPES}
          />
        </Container>
      </main>
    </RouteMessages>
  );
}
