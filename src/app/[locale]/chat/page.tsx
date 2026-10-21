import { Suspense } from "react";
import { headers } from "next/headers";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Chat } from "@/components/bot/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { readFreelanceFocus } from "@/modules/bot/service";
import { getJobForPublic } from "@/modules/jobs/service";
import { listMyInvites, readCampaign } from "@/modules/ugc/service";
import { HttpError } from "@/lib/http";
import { RouteMessages } from "@/components/shell/route-messages";
import { SpokiChatAddress } from "@/components/bot/spoki-chat-address";
import { spokiDockOn } from "@/components/bot/spoki-dock-on";

export const dynamic = "force-dynamic";

const JOB_ID = /^[0-9a-f-]{36}$/i;

/** `/chat` (section 9). `?job=` one vacancy. `?from=services` services. `?from=campaigns`, `?campaign=` and `?invite=` are creative tests (D457). `?service=`, `?order=` and `?confirm=` are freelance (D460). `?from=post_job` drafts a listing (D494). */
export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    job?: string;
    from?: string;
    campaign?: string;
    invite?: string;
    service?: string;
    order?: string;
    confirm?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // With the panel on, `/chat` is the panel over the whole page: the same
  // chat, never a second one (D525). The address only names the thread.
  if (spokiDockOn(await headers())) {
    const t = await getTranslations({ locale, namespace: "chat" });
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">{t("title")}</h1>
        <Suspense>
          <SpokiChatAddress />
        </Suspense>
      </main>
    );
  }
  const { job, from, campaign, invite, service, order, confirm } =
    await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const jobId = job && JOB_ID.test(job) ? job : undefined;
  const campaignId = campaign && JOB_ID.test(campaign) ? campaign : undefined;
  const inviteId = invite && JOB_ID.test(invite) ? invite : undefined;
  const row = jobId ? await getJobForPublic(jobId, { locale }) : null;
  let ugcProduct: string | undefined;
  if (user && user.status === "active" && (campaignId || inviteId) && !row) {
    try {
      const resolved =
        campaignId ??
        (await listMyInvites(user.id)).find(
          (item) => item.inviteId === inviteId,
        )?.campaignId;
      if (resolved) {
        ugcProduct = (await readCampaign(user.id, resolved)).brief.productName;
      }
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
    }
  }
  const userId = user && user.status === "active" ? user.id : null;
  const serviceId = service && JOB_ID.test(service) ? service : undefined;
  const orderId = order && JOB_ID.test(order) ? order : undefined;
  const freelance =
    !row && !campaignId && !inviteId && (serviceId || orderId)
      ? await readFreelanceFocus(userId, { serviceId, orderId })
      : null;
  const confirmId =
    userId && confirm && JOB_ID.test(confirm) ? confirm : undefined;
  const messages = (await getMessages({ locale })) as Record<string, unknown>;
  const freelanceCopy = (messages.chatFreelance ?? {}) as Record<
    string,
    unknown
  >;
  return (
    <RouteMessages
      namespaces={[
        "chat",
        "explain",
        "ugc",
        "notifications",
        "notificationSettings",
        "jobs",
      ]}
    >
      <main className="flex min-h-0 flex-1 flex-col">
        <Chat
          signedIn={user !== null}
          jobId={row?.id}
          fromServices={from === "services" && !row && !ugcProduct}
          fromCampaigns={
            from === "campaigns" && !row && !campaignId && !inviteId
          }
          fromFreelanceSell={
            from === "freelance_sell" && !row && !campaignId && !inviteId
          }
          fromPostJob={from === "post_job" && !row && !campaignId && !inviteId}
          campaignId={campaignId}
          inviteId={inviteId}
          ugcProduct={ugcProduct}
          serviceId={freelance?.kind === "service" ? freelance.id : undefined}
          orderId={freelance?.kind === "order" ? freelance.id : undefined}
          freelanceTitle={freelance?.title}
          freelanceCopy={freelanceCopy}
          confirmId={freelance ? undefined : confirmId}
          focus={
            row ? { title: row.title, company: row.company.name } : undefined
          }
        />
      </main>
    </RouteMessages>
  );
}
