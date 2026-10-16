import { setRequestLocale } from "next-intl/server";
import { Chat } from "@/components/bot/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { readFreelanceFocus } from "@/modules/bot/service";
import { getJobForPublic } from "@/modules/jobs/service";
import { listMyInvites, readCampaign } from "@/modules/ugc/service";
import { HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

const JOB_ID = /^[0-9a-f-]{36}$/i;

/** `/chat` (section 9). `?job=` one vacancy. `?from=services` services. `?from=campaigns`, `?campaign=` and `?invite=` are creative tests (D457). `?service=`, `?order=` and `?confirm=` are freelance (D460). */
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
  const { job, from, campaign, invite, service, order, confirm } =
    await searchParams;
  setRequestLocale(locale);
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
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Chat
        signedIn={user !== null}
        jobId={row?.id}
        fromServices={from === "services" && !row && !ugcProduct}
        fromCampaigns={from === "campaigns" && !row && !campaignId && !inviteId}
        campaignId={campaignId}
        inviteId={inviteId}
        ugcProduct={ugcProduct}
        serviceId={freelance?.kind === "service" ? freelance.id : undefined}
        orderId={freelance?.kind === "order" ? freelance.id : undefined}
        freelanceTitle={freelance?.title}
        confirmId={freelance ? undefined : confirmId}
        focus={
          row ? { title: row.title, company: row.company.name } : undefined
        }
      />
    </main>
  );
}
