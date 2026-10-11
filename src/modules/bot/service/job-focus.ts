import { formatMoneyDto } from "@/lib/money";
import { wrapUntrusted } from "@/lib/llm";
import { publicJobText } from "@/lib/public-job-text";
import { listOwnApplications } from "@/modules/applications/service";
import {
  getHiddenSetsForViewer,
  isJobSavedForUser,
} from "@/modules/feedback/service";
import { getJobForPublic } from "@/modules/jobs/service";

/** Facts the assistant may use about the open vacancy (D382). */
export type JobFocus = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  userStatus: string;
};

const OPENER: Record<string, (title: string, company: string) => string> = {
  en: (title, company) =>
    `I see you are looking at ${title} at ${company}. I can weigh how it fits you, draft a cover note, or prepare interview questions. I will not apply until you confirm.`,
  ru: (title, company) =>
    `Вижу, вы рассматриваете вакансию ${title} в ${company}. Могу оценить, насколько она вам подходит, помочь с сопроводительным письмом или подготовить вопросы для интервью. Отклик не отправлю, пока вы не подтвердите.`,
  es: (title, company) =>
    `Veo que miras ${title} en ${company}. Puedo valorar si te encaja, redactar una carta o preparar preguntas para la entrevista. No enviaré la candidatura hasta que lo confirmes.`,
  "pt-BR": (title, company) =>
    `Vejo que você está vendo ${title} na ${company}. Posso avaliar se combina com você, escrever uma carta ou preparar perguntas para a entrevista. Não envio a candidatura sem a sua confirmação.`,
};

/** First line of a job thread. The model answers later turns in the same language. */
export function jobFocusOpener(
  locale: string,
  title: string,
  company: string,
): string {
  const write = OPENER[locale] ?? OPENER.en!;
  return write(title, company);
}

/**
 * System addendum for one vacancy. Job text stays inside untrusted tags.
 * Applying still needs the confirmation card.
 */
export function jobFocusBlock(focus: JobFocus): string {
  return [
    `JOB FOCUS. The person is discussing one vacancy. Answer with this vacancy in mind. vacancy_id=${focus.jobId}.`,
    `Title: ${focus.title}`,
    `Company: ${focus.company}`,
    `Location: ${focus.location}`,
    `Salary: ${focus.salary}`,
    `Requirements: ${focus.requirements}`,
    `Their status on this vacancy: ${focus.userStatus}`,
    "Help them judge the fit, draft a cover note, or prepare questions for the employer.",
    "Do not call apply_to_job unless they explicitly ask to apply. The confirmation card sends it. Never say the application was sent before that card is confirmed.",
    wrapUntrusted(`job:${focus.jobId}`, focus.description),
  ].join("\n");
}

function salaryLine(
  job: {
    salaryMin: Parameters<typeof formatMoneyDto>[0];
    salaryMax: Parameters<typeof formatMoneyDto>[0];
  },
  locale: string,
): string {
  if (!job.salaryMin) return "not specified";
  const min = formatMoneyDto(job.salaryMin, locale);
  if (!job.salaryMax) return min;
  return `${min} – ${formatMoneyDto(job.salaryMax, locale)}`;
}

/** Public vacancy plus this person's saved, hidden, or applied status. */
export async function readJobFocus(
  userId: string | null,
  jobId: string,
  locale: string,
): Promise<JobFocus | null> {
  const job = await getJobForPublic(jobId, { locale });
  if (!job) return null;
  let userStatus = "none";
  if (userId) {
    const [saved, hidden, applications] = await Promise.all([
      isJobSavedForUser(userId, job.id),
      getHiddenSetsForViewer(userId),
      listOwnApplications(userId).catch(() => []),
    ]);
    const application = applications.find((row) => row.jobId === job.id);
    if (application) userStatus = `applied:${application.status}`;
    else if (hidden.hiddenJobIds.has(job.id)) userStatus = "hidden";
    else if (saved) userStatus = "saved";
  }
  const requirements = [
    job.skills.map((skill) => skill.name).join(", "),
    job.languages.map((language) => `${language.lang} ${language.minLevel}`).join(", "),
    job.experienceMin !== null ? `experience from ${job.experienceMin}` : "",
  ]
    .filter((part) => part.length > 0)
    .join("; ");
  const location = [job.location, job.locationCountry, job.workFormat]
    .filter((part): part is string => !!part && part.length > 0)
    .join(", ");
  return {
    jobId: job.id,
    title: job.title,
    company: job.company.name,
    location: location || "not specified",
    salary: salaryLine(job, locale),
    description: publicJobText(job.description) || job.title,
    requirements: requirements || "not specified",
    userStatus,
  };
}
