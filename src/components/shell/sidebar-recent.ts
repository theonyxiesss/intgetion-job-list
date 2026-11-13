import type { SidebarRecentChat } from "./app-sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listOwnConversations } from "@/modules/bot/service";
import { readSharedProfile } from "@/modules/users/service";

const THREAD_PARAM = { job: "job", campaign: "campaign", invite: "invite" };

/**
 * What the v2 side menu shows about the signed-in person (mockup): the three
 * latest Spoki threads and the name for the footer. Never breaks the page:
 * any failure just leaves the parts empty.
 */
export async function sidebarAccount(
  t: (key: string) => string,
): Promise<{ recent: SidebarRecentChat[]; name: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    if (!user) return { recent: [], name: null };
    const [items, profile] = await Promise.all([
      listOwnConversations(user.id, 3).catch(() => []),
      readSharedProfile(user.id).catch(() => null),
    ]);
    return {
      recent: items.map((item) => ({
        href:
          item.topic.kind === "general"
            ? "/chat"
            : `/chat?${THREAD_PARAM[item.topic.kind]}=${item.topic.id}`,
        title: item.preview ?? t("chat.history.noPreview"),
      })),
      name: profile?.displayName?.trim() || null,
    };
  } catch {
    return { recent: [], name: null };
  }
}
