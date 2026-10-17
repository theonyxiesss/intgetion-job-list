import { z } from "zod";
import { HttpError, notFound } from "@/lib/http";
import { redactPii, wrapUntrusted } from "@/lib/llm";
import { getOwnCandidate } from "@/modules/candidates/service";
import { getJobForPublic } from "@/modules/jobs/service";
import { judgeFit, personFromDraft, vacancyFromPublic } from "./fit";
import { profileDraft } from "./user-memory";
import type { BotTool, ToolContext } from "./tools";

/**
 * Spoki stands up for the candidate (D475). Before an application it reads
 * what is true about this person for this job, and writes a short letter in
 * the candidate's own voice from those facts only. The letter goes as the
 * cover note; the candidate reads it on the apply card and confirms.
 */

export const PITCH_MAX_CHARS = 1000;

const normal = (value: string) => value.trim().toLowerCase();

/** Checks a cover note before its card: length and no contacts. */
export function screenCoverNote(raw: string | undefined): string | null {
  const note = (raw ?? "").replace(/\s+\n/g, "\n").trim();
  if (!note) return null;
  if (Array.from(note).length > PITCH_MAX_CHARS) {
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      `The cover note is too long: keep it under ${PITCH_MAX_CHARS} characters.`,
    );
  }
  if (redactPii(note) !== note) {
    throw new HttpError(
      422,
      "COVER_NOTE_CONTACTS",
      "The cover note has an email, a phone or a link. Contacts open through the platform: write it again without them.",
    );
  }
  return note;
}

export type PitchFacts = {
  job: { id: string; title: string; company: string; skills: string[] };
  matchingSkills: string[];
  otherSkills: string[];
  experienceYears: number | null;
  desiredTitles: string[];
  languages: string[];
  matches: string[];
  gaps: string[];
};

/** What is true about this person for this job, from the saved profile. */
export async function pitchFacts(
  userId: string,
  jobId: string,
  locale: string,
): Promise<PitchFacts> {
  const [profile, job] = await Promise.all([
    getOwnCandidate(userId),
    getJobForPublic(jobId, { locale }),
  ]);
  if (!job) throw notFound();
  if (!profile) {
    throw new HttpError(
      409,
      "PROFILE_REQUIRED",
      "There is no candidate profile yet, so there are no facts to write from. Offer to fill the profile first.",
    );
  }
  const vacancy = vacancyFromPublic(job);
  const jobSkills = vacancy.skills.map(normal);
  const own = profile.skills.map((skill) => ({
    name: skill.nameEn,
    slug: normal(skill.slug),
    plain: normal(skill.nameEn),
  }));
  const matching = own.filter(
    (skill) =>
      jobSkills.includes(skill.slug) || jobSkills.includes(skill.plain),
  );
  const judged = judgeFit(personFromDraft(profileDraft(profile)), vacancy);
  return {
    job: {
      id: vacancy.id,
      title: vacancy.title,
      company: vacancy.company,
      skills: vacancy.skills,
    },
    matchingSkills: matching.map((skill) => skill.name),
    otherSkills: own
      .filter((skill) => !matching.includes(skill))
      .map((skill) => skill.name),
    experienceYears: profile.experienceYears,
    desiredTitles: profile.desiredTitles,
    languages: profile.languages.map(({ lang, level }) => `${lang} ${level}`),
    matches: judged.show ? judged.matches : [],
    gaps: judged.show ? judged.gaps : [judged.hard],
  };
}

function tool<T extends z.ZodType>(definition: BotTool<T>): BotTool {
  return definition as unknown as BotTool;
}

export const pitchTools: BotTool[] = [
  tool({
    name: "get_pitch_facts",
    description:
      "Before apply_to_job: read what is true about this person for this job (matching skills, other skills, years, wanted titles, languages, what fits and what is missing). Write the cover note only from these facts and MEMORY.",
    input: z.object({ jobId: z.uuid() }).strict(),
    access: "user",
    confirm: () => false,
    async run(ctx: ToolContext, input) {
      const facts = await pitchFacts(ctx.userId!, input.jobId, ctx.locale);
      return {
        llm: [
          wrapUntrusted(`job:${facts.job.id}`, JSON.stringify(facts.job)),
          wrapUntrusted(
            "user_message",
            JSON.stringify({
              matchingSkills: facts.matchingSkills,
              otherSkills: facts.otherSkills,
              experienceYears: facts.experienceYears,
              desiredTitles: facts.desiredTitles,
              languages: facts.languages,
              fits: facts.matches,
              missing: facts.gaps,
            }),
          ),
        ].join("\n"),
      };
    },
  }),
];
