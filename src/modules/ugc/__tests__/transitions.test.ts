import { describe, expect, it } from "vitest";
import {
  UGC_CAMPAIGN_STATUSES,
  UGC_PARTICIPATION_STATUSES,
  UGC_SUBMISSION_STATUSES,
  type UgcCampaignStatus,
  type UgcParticipationStatus,
  type UgcSubmissionStatus,
} from "@/config/ugc";
import { HttpError } from "@/lib/http";
import {
  checkCampaignTransition,
  checkParticipationTransition,
  checkSubmissionTransition,
  type CampaignActor,
  type ParticipationActor,
  type SubmissionActor,
} from "../service/transitions";

function allows(run: () => void): boolean {
  try {
    run();
    return true;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(409);
    expect((error as HttpError).code).toBe("INVALID_TRANSITION");
    return false;
  }
}

describe("campaign transitions", () => {
  const actors: CampaignActor[] = ["company", "admin"];

  it("opens only after an admin; the company may take it back from review, pause and resume (D512)", () => {
    const found = new Set<string>();
    for (const from of UGC_CAMPAIGN_STATUSES) {
      for (const to of UGC_CAMPAIGN_STATUSES) {
        for (const actor of actors) {
          if (
            allows(() =>
              checkCampaignTransition({
                from: from as UgcCampaignStatus,
                to: to as UgcCampaignStatus,
                actor,
              }),
            )
          ) {
            found.add(`${from}>${to}>${actor}`);
          }
        }
      }
    }
    expect(found).toEqual(
      new Set([
        "draft>pending_review>company",
        "pending_review>open>admin",
        "pending_review>rejected>admin",
        "pending_review>draft>company",
        "open>paused>company",
        "paused>open>company",
        "open>closed>company",
        "open>closed>admin",
        "paused>closed>company",
        "paused>closed>admin",
      ]),
    );
  });

  it("does not let the company skip the admin", () => {
    expect(
      allows(() =>
        checkCampaignTransition({
          from: "draft",
          to: "open",
          actor: "company",
        }),
      ),
    ).toBe(false);
  });
});

describe("participation transitions", () => {
  const actors: ParticipationActor[] = ["company", "creator", "system"];

  it("hires only when the creator accepts an offer", () => {
    const found = new Set<string>();
    for (const from of UGC_PARTICIPATION_STATUSES) {
      for (const to of UGC_PARTICIPATION_STATUSES) {
        for (const actor of actors) {
          if (
            allows(() =>
              checkParticipationTransition({
                from: from as UgcParticipationStatus,
                to: to as UgcParticipationStatus,
                actor,
              }),
            )
          ) {
            found.add(`${from}>${to}>${actor}`);
          }
        }
      }
    }
    expect(found).toEqual(
      new Set([
        "applied>offered>company",
        "applied>declined>company",
        "applied>withdrawn>creator",
        "applied>expired>system",
        "offered>hired>creator",
        "offered>declined>creator",
        "offered>withdrawn>company",
        "offered>expired>system",
      ]),
    );
  });
});

describe("submission transitions", () => {
  const actors: SubmissionActor[] = ["company", "creator"];

  it("allows one change request and a decision only from a fresh submission", () => {
    const found = new Set<string>();
    for (const from of UGC_SUBMISSION_STATUSES) {
      for (const to of UGC_SUBMISSION_STATUSES) {
        for (const actor of actors) {
          if (
            allows(() =>
              checkSubmissionTransition({
                from: from as UgcSubmissionStatus,
                to: to as UgcSubmissionStatus,
                actor,
              }),
            )
          ) {
            found.add(`${from}>${to}>${actor}`);
          }
        }
      }
    }
    expect(found).toEqual(
      new Set([
        "submitted>changes_requested>company",
        "changes_requested>submitted>creator",
        "submitted>accepted>company",
        "submitted>rejected>company",
        "submitted>winner>company",
      ]),
    );
  });
});
