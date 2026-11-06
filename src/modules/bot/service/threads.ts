import { notFound } from "@/lib/http";
import * as repo from "../repo/bot-repo";
import { hashSessionToken, newSessionToken } from "./conversation";

/** How long a dialogue title may be in the chat home's menu. */
const TITLE_MAX = 60;

export type MyConversation = {
  id: string;
  title: string | null;
  at: string;
  current: boolean;
};

function titleOf(line: string | null): string | null {
  const text = line?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const points = Array.from(text);
  return points.length > TITLE_MAX
    ? `${points.slice(0, TITLE_MAX - 1).join("")}…`
    : text;
}

/** The dialogues of the chat home's menu (TZ 53): a guest has only this one. */
export async function listMyConversations(input: {
  userId: string | null;
  token: string | undefined;
}): Promise<MyConversation[]> {
  const current = input.token
    ? await repo.findConversationByToken(hashSessionToken(input.token))
    : undefined;
  const currentId =
    current && current.userId === input.userId ? current.id : null;
  if (!input.userId) {
    return current && currentId
      ? [
          {
            id: current.id,
            title: null,
            at: current.lastMessageAt.toISOString(),
            current: true,
          },
        ]
      : [];
  }
  const rows = await repo.listGeneralConversationsForUser(input.userId);
  return rows.map((row) => ({
    id: row.id,
    title: titleOf(row.firstLine),
    at: row.lastMessageAt.toISOString(),
    current: row.id === currentId,
  }));
}

/** A fresh thread on a new cookie; the old one stays in the list. */
export async function startNewConversation(input: {
  userId: string | null;
  locale: string;
}): Promise<{ id: string; token: string }> {
  const token = newSessionToken();
  const conversation = await repo.createConversation({
    userId: input.userId,
    tokenHash: hashSessionToken(token),
    locale: input.locale,
  });
  return { id: conversation.id, token };
}

/** Only the owner's general web threads can be opened or removed. */
async function ownGeneral(userId: string, id: string) {
  const row = await repo.findConversationById(id);
  if (
    !row ||
    row.userId !== userId ||
    row.channel !== "web" ||
    row.jobId !== null ||
    row.campaignId !== null ||
    row.inviteId !== null
  ) {
    throw notFound();
  }
  return row;
}

/** Moves the cookie to one of the user's threads. */
export async function openMyConversation(
  userId: string,
  id: string,
): Promise<{ token: string }> {
  const row = await ownGeneral(userId, id);
  const token = newSessionToken();
  await repo.replaceSessionToken(row.id, hashSessionToken(token));
  return { token };
}

export async function deleteMyConversation(userId: string, id: string) {
  const row = await ownGeneral(userId, id);
  await repo.deleteConversation(row.id);
}
