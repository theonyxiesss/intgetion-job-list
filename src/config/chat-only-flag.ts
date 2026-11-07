/**
 * TZ 53: the chat is the platform. The browser builds links too, so the
 * switch is public: `NEXT_PUBLIC_CHAT_ONLY=true` closes cabinet pages into
 * the chat home and drops the language from addresses (settings choose it).
 * Read as a literal so Next inlines it in client code.
 */
export const CHAT_ONLY = process.env.NEXT_PUBLIC_CHAT_ONLY === "true";
