import type { APIRequestContext } from "@playwright/test";

/**
 * Reads auth emails from the local Supabase mail catcher (Mailpit; older CLIs
 * ship Inbucket). Only used against `supabase start` in CI.
 */
const mailUrl = (
  process.env.MAILPIT_URL ??
  process.env.INBUCKET_URL ??
  "http://127.0.0.1:54324"
).replace(/\/+$/, "");

type Mail = { id: string; html: string; text: string };

async function listMailpit(request: APIRequestContext, to: string) {
  const response = await request.get(`${mailUrl}/api/v1/search`, {
    params: { query: `to:"${to}"` },
  });
  if (!response.ok()) return undefined;
  const body = (await response.json()) as { messages: { ID: string }[] };
  // Mailpit returns the newest message first.
  return body.messages.map((message) => message.ID);
}

async function readMailpit(request: APIRequestContext, id: string) {
  const response = await request.get(`${mailUrl}/api/v1/message/${id}`);
  const body = (await response.json()) as { HTML: string; Text: string };
  return { id, html: body.HTML, text: body.Text };
}

async function listInbucket(request: APIRequestContext, to: string) {
  const mailbox = to.split("@")[0];
  const response = await request.get(`${mailUrl}/api/v1/mailbox/${mailbox}`);
  if (!response.ok()) return [];
  const body = (await response.json()) as { id: string }[];
  return body.map((message) => message.id).reverse();
}

async function readInbucket(
  request: APIRequestContext,
  to: string,
  id: string,
) {
  const mailbox = to.split("@")[0];
  const response = await request.get(
    `${mailUrl}/api/v1/mailbox/${mailbox}/${id}`,
  );
  const body = (await response.json()) as {
    body: { html: string; text: string };
  };
  return { id, html: body.body.html, text: body.body.text };
}

async function listIds(request: APIRequestContext, to: string) {
  return (await listMailpit(request, to)) ?? listInbucket(request, to);
}

async function read(request: APIRequestContext, to: string, id: string) {
  const viaMailpit = await request.get(`${mailUrl}/api/v1/message/${id}`);
  if (viaMailpit.ok()) return readMailpit(request, id);
  return readInbucket(request, to, id);
}

export async function countMails(request: APIRequestContext, to: string) {
  return (await listIds(request, to)).length;
}

/** Waits until `to` has more than `seen` messages and returns the newest. */
export async function waitForMail(
  request: APIRequestContext,
  to: string,
  seen = 0,
): Promise<Mail> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const ids = await listIds(request, to);
    if (ids.length > seen && ids[0]) return read(request, to, ids[0]);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no new mail for ${to}`);
}

/** The Supabase verification link from an auth email. */
export function authLink(mail: Mail): string {
  const source = `${mail.html}\n${mail.text}`.replace(/&amp;/g, "&");
  const match = source.match(
    /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/,
  );
  if (!match) throw new Error("no auth link in mail");
  return match[0];
}
