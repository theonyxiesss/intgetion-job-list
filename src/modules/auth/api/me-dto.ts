import type { CurrentUser } from "../service/auth-service";

/** `GET /api/me` (section 7). An explicit allowlist; `auth_uid` never leaves. */
export type MeDto = {
  id: string;
  locale: string;
  platformRole?: "admin";
  marketingOptIn: boolean;
  hasCandidateProfile: boolean;
  companies: MeCompany[];
};

export type MeCompany = { id: string; name: string; role: string };

/**
 * What other modules know about the user. The route handler gathers it
 * through their services, so auth does not depend on them. Candidate
 * profiles arrive in 2B; until then `hasCandidateProfile` is false (D37.6).
 */
export type MeContext = {
  companies: readonly MeCompany[];
  hasCandidateProfile: boolean;
};

export function toMeDto(
  user: CurrentUser,
  context: MeContext = { companies: [], hasCandidateProfile: false },
): MeDto {
  const dto: MeDto = {
    id: user.id,
    locale: user.locale,
    marketingOptIn: user.marketingOptIn,
    hasCandidateProfile: context.hasCandidateProfile,
    companies: context.companies.map(({ id, name, role }) => ({
      id,
      name,
      role,
    })),
  };
  if (user.platformRole === "admin") dto.platformRole = "admin";
  return dto;
}
