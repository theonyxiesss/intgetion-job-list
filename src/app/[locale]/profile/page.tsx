import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/**
 * "My profile" and "My account" are one page (D517): the about-me block,
 * the plan, every service and sign-in live on /account. The job-search
 * form stays at /profile/edit.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/account", locale });
}
