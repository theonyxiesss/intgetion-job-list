import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { requireAdminPermission } from "@/admin/action";
import { can } from "@/admin/permissions";
import { PeopleActions } from "@/components/admin/people-actions";
import { AdminShell } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/ui";
import { HttpError } from "@/lib/http";
import { personCard } from "@/modules/admin-console/service";

export default async function AdminUserCard({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  let access;
  try {
    access = await requireAdminPermission("users.read");
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const allowed = (permission: Parameters<typeof can>[1]) =>
    access.legacy || (access.role ? can(access.role, permission) : false);
  const t = await getTranslations("admin");
  const person = await personCard(id).catch((error: unknown) => {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  });
  if (!person) notFound();

  return (
    <AdminShell title={person.name ?? t("usersTitle")} active="users">
      <p className="t-body-s text-fg-muted">
        <StatusBadge status={person.status}>{person.status}</StatusBadge>
        {" · "}
        {person.locale}
        {" · "}
        {person.createdAt.slice(0, 10)}
      </p>
      {person.headline && <p>{person.headline}</p>}
      <dl className="grid gap-2">
        <div>
          <dt className="t-label text-fg-muted">{t("colEmail")}</dt>
          <dd>{person.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="t-label text-fg-muted">{t("colPhone")}</dt>
          <dd>{person.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="t-label text-fg-muted">{t("colTelegram")}</dt>
          <dd>{person.telegram ?? "—"}</dd>
        </div>
      </dl>
      {person.companies.length > 0 && (
        <ul className="flex flex-col gap-1">
          {person.companies.map((company) => (
            <li key={company.id}>
              {company.name} · {company.role}
            </li>
          ))}
        </ul>
      )}
      {person.notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {person.notes.map((note) => (
            <li key={note.id} className="border border-line px-3 py-2">
              <p>{note.body}</p>
              <p className="t-caption text-fg-muted">
                {(note.author ?? note.authorId.slice(0, 8)) +
                  " · " +
                  note.createdAt.slice(0, 16)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <PeopleActions
        userId={person.id}
        status={person.status}
        myId={access.user.id}
        canSuspend={allowed("users.suspend")}
        canBan={allowed("users.ban")}
        canDelete={allowed("users.delete")}
        canSignOut={allowed("users.signout")}
        canReset={allowed("users.reset_password")}
        canNote={allowed("users.note")}
        canReveal={allowed("users.pii.read")}
        approvals={person.approvals}
      />
    </AdminShell>
  );
}
