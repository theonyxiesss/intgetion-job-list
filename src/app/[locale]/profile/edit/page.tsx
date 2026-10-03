import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ProfileForm,
  type ProfileFormValues,
} from "@/components/profile/profile-form";
import { HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { getOwnCandidate } from "@/modules/candidates/service";
import { getOwnContacts } from "@/modules/contacts/service";
import { redirect } from "@/i18n/navigation";

function emptyForm(): ProfileFormValues {
  return {
    fullName: "",
    headline: "",
    desiredTitles: "",
    country: "",
    city: "",
    timezone: "",
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
    workFormats: ["remote"],
    employmentTypes: ["full_time"],
    experienceYears: "",
    salaryMin: "",
    salaryCurrency: "",
    salaryPeriod: "year",
    salaryBasis: "gross",
    skills: "",
    skillLevel: "intermediate",
    language: "",
    languageLevel: "B2",
    contactEmail: "",
    phone: "",
  };
}

export default async function EditProfilePage({
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
  const initial = emptyForm();
  if (profile) {
    initial.fullName = profile.fullName ?? "";
    initial.headline = profile.headline ?? "";
    initial.desiredTitles = profile.desiredTitles.join(", ");
    initial.country = profile.country ?? "";
    initial.city = profile.city ?? "";
    initial.timezone = profile.timezone;
    initial.workHoursStart = profile.workHoursStart;
    initial.workHoursEnd = profile.workHoursEnd;
    initial.workDays = profile.workDays;
    initial.workFormats = profile.workFormats;
    initial.employmentTypes = profile.employmentTypes;
    initial.experienceYears =
      profile.experienceYears === null ? "" : String(profile.experienceYears);
    initial.salaryMin = profile.salaryMin?.amountMinor ?? "";
    initial.salaryCurrency = profile.salaryMin?.currency ?? "";
    initial.salaryPeriod = profile.salaryMin?.period ?? "year";
    initial.salaryBasis = profile.salaryMin?.basis ?? "gross";
    initial.skills = profile.skills.map((skill) => skill.nameEn).join(", ");
    initial.skillLevel = profile.skills[0]?.level ?? "intermediate";
    initial.language = profile.languages[0]?.lang ?? "";
    initial.languageLevel = profile.languages[0]?.level ?? "B2";
  }
  if (contacts) {
    initial.contactEmail = contacts.email;
    initial.phone = contacts.phone ?? "";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("editTitle")}</h1>
      <ProfileForm initial={initial} />
    </main>
  );
}
