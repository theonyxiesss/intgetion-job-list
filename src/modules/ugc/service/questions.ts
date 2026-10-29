import { UGC_LIMITS as L } from "@/config/ugc";
import { validationError } from "@/lib/http";
import { assertNoContacts } from "./rules";

/** The questions a brief asks at application (U3б, TZ 48 §5). */
export function cleanQuestions(raw: readonly string[]): string[] {
  const out = raw.map((row) => row.trim()).filter(Boolean);
  if (out.length > L.questionsMax) {
    throw validationError([{ path: "questions", problem: "count" }]);
  }
  for (const [index, question] of out.entries()) {
    if (question.length > L.questionMax) {
      throw validationError([
        { path: `questions.${index}`, problem: "length" },
      ]);
    }
    assertNoContacts(question, `questions.${index}`);
  }
  return out;
}

/**
 * One answer per question, in order, each filled in. A brief without
 * questions takes no answers: whatever is sent is dropped.
 */
export function cleanAnswers(
  questions: readonly string[],
  raw: readonly string[] | undefined,
): string[] {
  if (questions.length === 0) return [];
  const given = (raw ?? []).map((row) => row.trim());
  if (given.length !== questions.length) {
    throw validationError([{ path: "answers", problem: "required" }]);
  }
  for (const [index, answer] of given.entries()) {
    if (!answer || answer.length > L.answerMax) {
      throw validationError([{ path: `answers.${index}`, problem: "length" }]);
    }
    assertNoContacts(answer, `answers.${index}`);
  }
  return given;
}
