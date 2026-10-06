export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailSender {
  /** `skipped` means nothing left the process (D126). */
  send(message: OutboundEmail): Promise<"sent" | "skipped">;
}

export const noopEmailSender: EmailSender = {
  async send() {
    return "skipped";
  },
};

export function resendEmailSender(apiKey: string, from: string): EmailSender {
  return {
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!response.ok) {
        throw new Error(`resend ${response.status}`);
      }
      return "sent";
    },
  };
}

/**
 * Whether a letter of ours can actually leave the process (D320). Callers use
 * it before asking Supabase for a token: minting one counts as a send against
 * Supabase's own rate limit, so doing it when we cannot deliver would block
 * the letter Supabase would otherwise have sent itself.
 */
export function emailSenderConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
}

/** No key → noop. A key without EMAIL_FROM still refuses to call the network. */
export function senderFromEnv(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return noopEmailSender;
  return resendEmailSender(apiKey, from);
}
