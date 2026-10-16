import type {
  UgcCampaignStatus,
  UgcParticipationStatus,
  UgcSubmissionStatus,
} from "@/config/ugc";
import { errorCodes, HttpError } from "@/lib/http";

export type CampaignActor = "company" | "admin";
export type ParticipationActor = "company" | "creator" | "system";
export type SubmissionActor = "company" | "creator";

type Edge<S, A> = { from: S; to: S; actors: readonly A[] };

export const CAMPAIGN_TRANSITIONS: readonly Edge<
  UgcCampaignStatus,
  CampaignActor
>[] = [
  { from: "draft", to: "pending_review", actors: ["company"] },
  { from: "pending_review", to: "open", actors: ["admin"] },
  { from: "pending_review", to: "rejected", actors: ["admin"] },
  { from: "open", to: "closed", actors: ["company", "admin"] },
];

export const PARTICIPATION_TRANSITIONS: readonly Edge<
  UgcParticipationStatus,
  ParticipationActor
>[] = [
  { from: "applied", to: "offered", actors: ["company"] },
  { from: "applied", to: "declined", actors: ["company"] },
  { from: "applied", to: "withdrawn", actors: ["creator"] },
  { from: "applied", to: "expired", actors: ["system"] },
  { from: "offered", to: "hired", actors: ["creator"] },
  { from: "offered", to: "declined", actors: ["creator"] },
  { from: "offered", to: "withdrawn", actors: ["company"] },
  { from: "offered", to: "expired", actors: ["system"] },
];

export const SUBMISSION_TRANSITIONS: readonly Edge<
  UgcSubmissionStatus,
  SubmissionActor
>[] = [
  { from: "submitted", to: "changes_requested", actors: ["company"] },
  { from: "changes_requested", to: "submitted", actors: ["creator"] },
  { from: "submitted", to: "accepted", actors: ["company"] },
  { from: "submitted", to: "rejected", actors: ["company"] },
  { from: "submitted", to: "winner", actors: ["company"] },
];

function refuse(): never {
  throw new HttpError(
    409,
    errorCodes.invalidTransition,
    "This status change is not allowed",
  );
}

function check<S extends string, A extends string>(
  edges: readonly Edge<S, A>[],
  from: S,
  to: S,
  actor: A,
): void {
  const edge = edges.find((item) => item.from === from && item.to === to);
  if (!edge || !edge.actors.includes(actor)) refuse();
}

export function checkCampaignTransition(input: {
  from: UgcCampaignStatus;
  to: UgcCampaignStatus;
  actor: CampaignActor;
}): void {
  check(CAMPAIGN_TRANSITIONS, input.from, input.to, input.actor);
}

export function checkParticipationTransition(input: {
  from: UgcParticipationStatus;
  to: UgcParticipationStatus;
  actor: ParticipationActor;
}): void {
  check(PARTICIPATION_TRANSITIONS, input.from, input.to, input.actor);
}

export function checkSubmissionTransition(input: {
  from: UgcSubmissionStatus;
  to: UgcSubmissionStatus;
  actor: SubmissionActor;
}): void {
  check(SUBMISSION_TRANSITIONS, input.from, input.to, input.actor);
}
