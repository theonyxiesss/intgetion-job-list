import type { JobRow } from "../repo/jobs-repo";
import { toJobMoneyDto } from "./money-dto";

export function toJobDto(job: JobRow) {
  const moneyInfo = {
    currency: job.salaryCurrency,
    period: job.salaryPeriod,
    basis: job.salaryBasis,
  };
  return {
    id: job.id,
    companyId: job.companyId,
    title: job.title,
    description: job.description,
    category: job.category,
    workFormat: job.workFormat,
    employmentType: job.employmentType,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    location: job.location,
    locationCountry: job.locationCountry?.trim() ?? null,
    countryRestrictions:
      job.countryRestrictions?.map((country) => country.trim()) ?? null,
    timezoneRequired: job.timezoneRequired,
    workHoursStart: job.workHoursStart,
    workHoursEnd: job.workHoursEnd,
    minOverlapHours: job.minOverlapHours,
    salaryMin: toJobMoneyDto({ amountMinor: job.salaryMin, ...moneyInfo }),
    salaryMax: toJobMoneyDto({ amountMinor: job.salaryMax, ...moneyInfo }),
    applicationMethod: job.applicationMethod,
    applicationUrl: job.applicationUrl,
    applicationEmail: job.applicationEmail,
    status: job.status,
    riskScore: job.riskScore,
    riskFlags: job.riskFlags,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
