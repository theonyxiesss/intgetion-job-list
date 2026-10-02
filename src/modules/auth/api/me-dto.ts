import type { CurrentUser } from "../service/auth-service";

/** `GET /api/me` (section 7). An explicit allowlist; `auth_uid` never leaves. */
export type MeDto = {
  id: string;
  locale: string;
  platformRole?: "admin";
  marketingOptIn: boolean;
  hasCandidateProfile: boolean;
  companies: { id: string; name: string; role: string }[];
};

/**
 * Candidate profiles arrive in 2B and companies in 3A (D37); until those
 * tables exist the honest answer is "none".
 */
export function toMeDto(user: CurrentUser): MeDto {
  const dto: MeDto = {
    id: user.id,
    locale: user.locale,
    marketingOptIn: user.marketingOptIn,
    hasCandidateProfile: false,
    companies: [],
  };
  if (user.platformRole === "admin") dto.platformRole = "admin";
  return dto;
}
