import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  Container,
  EmptyState,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  navForward,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  listAccessibleContacts,
  readApplicationContacts,
} from "@/modules/applications/service";
import type { ContactsDto } from "@/modules/contacts/service";
import { localePrefix } from "@/i18n/paths";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);

  const t = await getTranslations("contacts");
  const statusT = await getTranslations("employerApplications");
  const items = await listAccessibleContacts(user.id);
  const open: Array<
    Awaited<ReturnType<typeof listAccessibleContacts>>[number] & {
      contacts: ContactsDto;
    }
  > = [];
  for (const item of items) {
    try {
      const contacts = await readApplicationContacts(
        user.id,
        item.applicationId,
      );
      open.push({ ...item, contacts });
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 404) throw error;
    }
  }

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("intro")} />
        {open.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <Table caption={t("title")}>
            <thead>
              <tr>
                <Th>{statusT("candidate")}</Th>
                <Th>{t("job")}</Th>
                <Th>{t("contactsCol")}</Th>
                <Th>{statusT("status.shortlisted")}</Th>
              </tr>
            </thead>
            <tbody>
              {open.map((item) => (
                <Tr key={item.applicationId}>
                  <Td>
                    <Link
                      {...navForward}
                      href={`/employer/applications/${item.applicationId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {item.candidateName ?? t("unnamed")}
                    </Link>
                  </Td>
                  <Td className="text-fg-muted">{item.jobTitle}</Td>
                  <Td mono>
                    <span className="block">{item.contacts.email}</span>
                    {item.contacts.phone ? (
                      <span className="block">{item.contacts.phone}</span>
                    ) : null}
                    {item.contacts.telegram ? (
                      <span className="block">{item.contacts.telegram}</span>
                    ) : null}
                  </Td>
                  <Td>
                    <StatusBadge status={item.status}>
                      {statusT(`status.${item.status}`)}
                    </StatusBadge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>
    </main>
  );
}
