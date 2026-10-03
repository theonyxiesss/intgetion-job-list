import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { HttpError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  listAccessibleContacts,
  readApplicationContacts,
} from "@/modules/applications/service";
import type { ContactsDto } from "@/modules/contacts/service";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("contacts");
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {open.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-4">
        {open.map((item) => (
          <li key={item.applicationId} className="flex flex-col gap-1">
            <Link
              className="underline"
              href={`/${locale}/employer/applications/${item.applicationId}`}
            >
              {item.candidateName ?? t("unnamed")}
            </Link>
            <p>{item.jobTitle}</p>
            <p>{item.contacts.email}</p>
            {item.contacts.phone ? <p>{item.contacts.phone}</p> : null}
            {item.contacts.telegram ? <p>{item.contacts.telegram}</p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
