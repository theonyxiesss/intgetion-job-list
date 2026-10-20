import { publicHttpUrl } from "@/lib/company-mark";
import { HttpError } from "@/lib/http";
import type { CurrentUser } from "@/modules/auth/service";
import {
  createCompany,
  editCompany,
  getCompaniesForUser,
} from "@/modules/companies/service";
import {
  hirePublishesNow,
  hireToJobFields,
  socialProfileUrl,
  withHttpScheme,
  type HireInput,
} from "../schemas/hire";
import { noteSharedProfile } from "@/modules/users/service";
import { createJob } from "../repo/jobs-repo";
import { transitionOwnedJob } from "./notify-job";

const posterRoles = ["owner", "admin", "recruiter"] as const;

/**
 * One submit from the hire form (D391). The job is queued for an admin.
 * A member cannot publish it onto the public list.
 */
export async function submitHireListing(
  user: CurrentUser,
  email: string | null | undefined,
  input: HireInput,
) {
  const companies = (await getCompaniesForUser(user.id)).filter(
    (company) =>
      company.origin === "internal" &&
      (posterRoles as readonly string[]).includes(company.role),
  );
  let companyId = input.companyId ?? companies[0]?.id ?? null;
  const owned = companies.find((company) => company.id === companyId);
  if (companyId && !owned)
    throw new HttpError(404, "NOT_FOUND", "Company not found");

  const website = input.website
    ? publicHttpUrl(withHttpScheme(input.website))
    : null;
  const xUrl = socialProfileUrl("x", input.xHandle);
  const telegramUrl = socialProfileUrl("telegram", input.telegram);
  const links = {
    ...(website ? { websiteUrl: website } : {}),
    ...(xUrl ? { xUrl } : {}),
    ...(telegramUrl ? { telegramUrl } : {}),
  };

  if (!companyId) {
    const host = website
      ? new URL(website).hostname.replace(/^www\./, "")
      : null;
    const created = await createCompany(user, {
      name: input.companyName,
      domain: host,
      ...links,
    });
    companyId = created.id;
  } else if (owned && (owned.role === "owner" || owned.role === "admin")) {
    await editCompany(companyId, user, { name: input.companyName, ...links });
  }

  // The name goes to the shared profile, and only when it is empty: the
  // person posting may name someone else as the hiring manager (D506).
  await noteSharedProfile(
    user.id,
    { displayName: `${input.firstName.trim()} ${input.lastName.trim()}` },
    "fill",
  );
  const created = await createJob(
    user,
    email,
    hireToJobFields(input, companyId),
  );
  const queued = await transitionOwnedJob(created.id, "publish", user.id);
  if (!hirePublishesNow(user.platformRole)) return queued;
  return transitionOwnedJob(queued.id, "approve", user.id, "admin");
}
