import { forbidden, HttpError, notFound } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import type { CurrentUser } from "@/modules/auth/service";
import * as repo from "../repo/company-repo";
import type { CreateCompanyInput, PatchCompanyInput } from "../schemas";

export type { CompanyRow, CompanySummary } from "../repo/company-repo";
export const findMemberRole = repo.findMemberRole;

export function assertCompanyEditable(
  company: Pick<repo.CompanyRow, "origin">,
  role: string | null,
) {
  if (!role) throw notFound();
  if (company.origin === "imported")
    throw new HttpError(
      422,
      "IMPORTED_READONLY",
      "Imported companies cannot be edited",
    );
  if (role !== "owner" && role !== "admin") throw forbidden();
}

export async function createCompany(
  user: CurrentUser,
  input: CreateCompanyInput,
) {
  return repo.createCompany(user.id, input);
}

export async function getPublicCompany(slug: string) {
  const company = await repo.findCompanyBySlug(slug);
  if (!company) throw notFound();
  return { company, jobs: [] as never[] };
}

export async function getCompaniesForUser(userId: string) {
  return repo.findCompaniesForUser(userId);
}

export async function setCompanyLogo(
  companyId: string,
  bytes: Buffer,
  mime: string,
  storage: import("./logo-service").LogoStorage,
) {
  const { storeLogo } = await import("./logo-service");
  const saved = await storeLogo(bytes, mime, storage);
  const updated = await repo.setLogoPath(companyId, saved.logoPath);
  if (!updated) throw notFound();
  return saved;
}

export async function editCompany(
  companyId: string,
  user: CurrentUser,
  input: PatchCompanyInput,
) {
  const company = await repo.findCompanyById(companyId);
  const role = await findMemberRole(companyId, user.id);
  if (!company) throw notFound();
  assertCompanyEditable(company, role);
  const updated = await repo.updateCompany(companyId, input);
  if (!updated) throw notFound();
  return updated;
}

export async function assertCanEditCompany(
  companyId: string,
  user: CurrentUser,
) {
  const company = await repo.findCompanyById(companyId);
  const role = await findMemberRole(companyId, user.id);
  if (!company) throw notFound();
  assertCompanyEditable(company, role);
  return company;
}

export async function recordCompanyStatusChange(
  companyId: string,
  actorId: string,
  from: string,
  to: string,
) {
  await recordAudit({
    actorId,
    action: "company.status_changed",
    entityType: "company",
    entityId: companyId,
    diff: { from, to },
  });
}

export async function changeCompanyStatus(
  companyId: string,
  actorId: string,
  status:
    | "unverified"
    | "pending_verification"
    | "verified"
    | "rejected"
    | "suspended",
) {
  const current = await repo.findCompanyById(companyId);
  if (!current) throw notFound();
  const updated = await repo.setCompanyStatus(companyId, status);
  if (!updated) throw notFound();
  await recordCompanyStatusChange(companyId, actorId, current.status, status);
  return updated;
}

export async function removeCompanyMember(companyId: string, userId: string) {
  const removed = await repo.removeMember(companyId, userId);
  if (!removed)
    throw forbidden("Cannot remove the last owner or join an imported company");
}

export async function addCompanyMember(companyId: string, userId: string) {
  const added = await repo.addCompanyMember(companyId, userId);
  if (!added) throw forbidden("Cannot join an imported or unavailable company");
}
