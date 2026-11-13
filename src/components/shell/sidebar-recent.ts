import type { SidebarRecentChat } from "./app-sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listOwnConversations } from "@/modules/bot/service";

const THREAD_PARAM = { job: "job", campaign: "campaign", invite: "invite" };

/**
 * The three latest Spoki threads for the v2 side menu (mockup «Recent chats»).
 * Never breaks the page: any failure just leaves the list empty.
 */
export async function sidebarRecentChats(
  t: (key: string) => string,
): Promise<SidebarRecentChat[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    if (!user) return [];
    const items = await listOwnConversations(user.id, 3);
    return items.map((item) => ({
      href:
        item.topic.kind === "general"
          ? "/chat"
          : `/chat?${THREAD_PARAM[item.topic.kind]}=${item.topic.id}`,
      title: item.preview ?? t("chat.history.noPreview"),
    }));
  } catch {
    return [];
  }
}
