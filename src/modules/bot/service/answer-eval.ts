export type GroundedAnswerInput = {
  locale: "en" | "ru";
  answer: string;
  userText: string;
  toolResult: string;
  requiredFacts: readonly string[];
  empty: boolean;
};

export type GroundedAnswerScore = {
  pass: boolean;
  issues: string[];
};

export function scoreGroundedAnswer(
  input: GroundedAnswerInput,
): GroundedAnswerScore {
  const issues: string[] = [];
  const normalized = (value: string) =>
    value.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const answer = normalized(input.answer);

  for (const fact of input.requiredFacts) {
    if (!answer.includes(normalized(fact))) issues.push(`missing_fact:${fact}`);
  }

  const languageText = input.requiredFacts.reduce(
    (text, fact) => text.replace(normalized(fact), ""),
    answer,
  );
  const cyrillic = (languageText.match(/[а-яё]/g) ?? []).length;
  if (input.locale === "ru" ? cyrillic < 3 : cyrillic > 0) {
    issues.push(`language:${input.locale}`);
  }

  const supportedPrices = new Set(
    [...pricesInText(input.userText), ...pricesInText(input.toolResult)].map(
      String,
    ),
  );
  for (const price of new Set(pricesInText(input.answer).map(String))) {
    if (!supportedPrices.has(price)) issues.push(`unsupported_price:${price}`);
  }

  if (input.empty) {
    const honest =
      input.locale === "ru"
        ? /\bнет\b|не наш[её]л|не нашлось|не найден|ничего|отсутств|пока нет|не опубликован/u.test(
            answer,
          )
        : /\bno\b|\bnone\b|nothing|not found|unavailable|not published/u.test(
            answer,
          );
    const claimsMatch =
      /found (?:a|an|some|one|\d+)|here (?:is|are)|(?<!не )наш[её]л(?:а|и)?\s+(?:ваканс|услуг|событ)|есть\s+(?:ваканс|услуг|событ)/iu.test(
        answer,
      );
    if (!honest || claimsMatch) issues.push("empty_result_claim");
  }

  return { pass: issues.length === 0, issues };
}
import { pricesInText } from "./eval-run";
