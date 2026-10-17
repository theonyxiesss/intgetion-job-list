/**
 * How long Spoki keeps the text of a chat (D471). After this the text and
 * the tool arguments are wiped; the row keeps only its token and cost
 * counters, which the budget breaker and the anomaly check read. What Spoki
 * should keep about a person lives in Spoki memory (D469), not in the chat.
 */
export const CHAT_TEXT_TTL_HOURS = 24;
export const CHAT_TEXT_TTL_MS = CHAT_TEXT_TTL_HOURS * 60 * 60 * 1000;
