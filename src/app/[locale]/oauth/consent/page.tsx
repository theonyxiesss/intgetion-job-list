import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui";
import { loginReturnHref, type LoginNext } from "@/components/auth/login-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  approveMcpAuthorization,
  declineMcpAuthorization,
  getMcpAuthorizationRequest,
  mcpAuthorizationCookieName,
} from "@/modules/mcp/service";
import { localePath } from "@/i18n/paths";
import { originValidationResponse } from "@modelcontextprotocol/server";
import { allowedOrigins } from "@/modules/mcp/service";

function authorizationRedirect(
  uri: string,
  key: "code" | "error",
  value: string,
  state: string | null,
) {
  const target = new URL(uri);
  target.searchParams.set(key, value);
  if (state) target.searchParams.set("state", state);
  return target.toString();
}

export default async function McpConsentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mcp");
  const cookieStore = await cookies();
  const requestId = cookieStore.get(mcpAuthorizationCookieName())?.value;
  if (!requestId) redirect(localePath(locale, "/settings/assistants"));
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(loginReturnHref(locale, "mcp-consent" as LoginNext));
  const request = await getMcpAuthorizationRequest(
    decodeURIComponent(requestId),
  );
  if (!request)
    redirect(localePath(locale, "/settings/assistants?error=expired"));

  async function approve() {
    "use server";
    const actionHeaders = await headers();
    const rejected = originValidationResponse(
      new Request(
        `${actionHeaders.get("x-forwarded-proto") ?? "https"}://${actionHeaders.get("host") ?? "localhost"}/oauth/consent`,
        { headers: actionHeaders },
      ),
      allowedOrigins(),
    );
    if (rejected)
      redirect(localePath(locale, "/settings/assistants?error=origin"));
    const stored = (await cookies()).get(mcpAuthorizationCookieName())?.value;
    if (!stored)
      redirect(localePath(locale, "/settings/assistants?error=expired"));
    const auth = await createSupabaseServerClient();
    const current = await getCurrentUser(auth.auth);
    if (!current) redirect(loginReturnHref(locale, "mcp-consent"));
    const result = await approveMcpAuthorization({
      requestId: decodeURIComponent(stored),
      userId: current.id,
    });
    if (!result)
      redirect(localePath(locale, "/settings/assistants?error=expired"));
    (await cookies()).delete(mcpAuthorizationCookieName());
    redirect(
      authorizationRedirect(
        result.request.redirectUri,
        "code",
        result.code,
        result.request.state,
      ),
    );
  }

  async function decline() {
    "use server";
    const actionHeaders = await headers();
    const rejected = originValidationResponse(
      new Request(
        `${actionHeaders.get("x-forwarded-proto") ?? "https"}://${actionHeaders.get("host") ?? "localhost"}/oauth/consent`,
        { headers: actionHeaders },
      ),
      allowedOrigins(),
    );
    if (rejected)
      redirect(localePath(locale, "/settings/assistants?error=origin"));
    const stored = (await cookies()).get(mcpAuthorizationCookieName())?.value;
    if (!stored)
      redirect(localePath(locale, "/settings/assistants?error=expired"));
    const result = await declineMcpAuthorization(decodeURIComponent(stored));
    (await cookies()).delete(mcpAuthorizationCookieName());
    if (!result)
      redirect(localePath(locale, "/settings/assistants?error=expired"));
    redirect(
      authorizationRedirect(
        result.redirectUri,
        "error",
        "access_denied",
        result.state,
      ),
    );
  }

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("consentTitle")} />
        <section className="surface-card flex flex-col gap-5 p-6">
          <h2 className="font-display text-xl font-semibold">
            {t("consentClient", { client: request.clientName })}
          </h2>
          <p className="t-body-m text-fg-muted">{t("consentDescription")}</p>
          <ul className="list-disc pl-6">
            {request.scopes.map((scope) => (
              <li key={scope}>{t(`scope.${scope}`)}</li>
            ))}
          </ul>
          <p className="t-body-s text-fg-muted">
            {t("consentAccount", { id: user.id.slice(0, 8) })}
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={approve}>
              <button className="rounded-full bg-accent px-5 py-3 font-medium text-accent-fg">
                {t("allow")}
              </button>
            </form>
            <form action={decline}>
              <button className="rounded-full border border-line px-5 py-3 font-medium">
                {t("deny")}
              </button>
            </form>
          </div>
        </section>
      </Container>
    </main>
  );
}
