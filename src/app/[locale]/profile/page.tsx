import { getTranslations, setRequestLocale } from "next-intl/server";
import { HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { getOwnCandidate } from "@/modules/candidates/service";
import { getOwnContacts } from "@/modules/contacts/service";
import { Link, redirect } from "@/i18n/navigation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }

  const t = await getTranslations("profile");
  const profile = await getOwnCandidate(user.id);
  const contacts = profile ? await getOwnContacts(user.id) : null;
  const score = profile?.completeness ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t("completenessLabel")}</h2>
        <div
          role="progressbar"
          aria-label={t("completenessLabel")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          className="h-3 w-full border border-current/30"
        >
          <div
            className="h-full bg-foreground"
            style={{ width: `${score}%` }}
          />
        </div>
        <p>{t("completenessValue", { score })}</p>
      </section>

      {!profile ? (
        <p>
          {t("empty")}{" "}
          <Link href="/profile/edit" className="underline">
            {t("create")}
          </Link>
        </p>
      ) : (
        <>
          {profile.missing.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{t("missingTitle")}</h2>
              <ul className="list-disc pl-5">
                {profile.missing.map((part) => (
                  <li key={part}>{t(`missing.${part}`)}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <p>
            <Link href="/profile/edit" className="underline">
              {t("edit")}
            </Link>
          </p>
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">{t("contactsTitle")}</h2>
            <p>{t("contactsHint")}</p>
            {contacts ? <p>{contacts.email}</p> : <p>{t("noContacts")}</p>}
          </section>
        </>
      )}
    </main>
  );
}
