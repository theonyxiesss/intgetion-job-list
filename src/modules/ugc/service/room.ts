import type { UgcParticipationStatus } from "@/config/ugc";
import { HttpError, validationError } from "@/lib/http";
import { UGC_ERRORS, hasContacts } from "./rules";

/**
 * The order room of one participation (U4, TZ 48 §8, D574). Pure: a check of
 * what may be written and one feed of people's messages and the events the
 * order already has. Messages talk; they never accept terms or a video.
 */

export const UGC_ROOM_LIMITS = { bodyMax: 2000 } as const;

/** Questions before the creator agrees, and the work after it. */
export const UGC_ROOM_WRITABLE: readonly UgcParticipationStatus[] = [
  "offered",
  "hired",
];

/** D574: message text stays 12 months after the order closed. */
export const UGC_ROOM_RETENTION_DAYS = 365;

export function checkRoomMessage(input: {
  status: UgcParticipationStatus;
  body: string;
}): string {
  if (!UGC_ROOM_WRITABLE.includes(input.status)) {
    throw new HttpError(
      409,
      UGC_ERRORS.roomClosed,
      "This order no longer takes messages",
    );
  }
  const body = input.body.trim();
  if (body.length === 0 || body.length > UGC_ROOM_LIMITS.bodyMax) {
    throw validationError([{ path: "body", problem: "length" }]);
  }
  if (hasContacts(body)) {
    throw new HttpError(
      422,
      UGC_ERRORS.contactsInText,
      "Remove contacts and links from the message",
    );
  }
  return body;
}

export type RoomSide = "company" | "creator";

export type RoomFeedItem =
  | {
      kind: "message";
      id: string;
      at: string;
      /** `deleted` when the author's account is gone. */
      side: RoomSide | "deleted";
      mine: boolean;
      /** Null when a moderator hid it; the line stays, the text does not. */
      body: string | null;
      hidden: boolean;
    }
  | { kind: "event"; id: string; at: string; event: "offered" | "agreed" };

export type RoomFeedSources = {
  viewerId: string;
  creatorId: string;
  messages: readonly {
    id: string;
    authorId: string | null;
    body: string;
    createdAt: string;
    hiddenAt: string | null;
  }[];
  offeredAt: string | null;
  agreedAt: string | null;
};

// Same instant: the event first, then the talk it started; messages keep
// the order they were read in (the sort is stable).
const KIND_ORDER = { event: 0, message: 1 } as const;

export function buildRoomFeed(source: RoomFeedSources): RoomFeedItem[] {
  const items: RoomFeedItem[] = [];
  if (source.offeredAt) {
    items.push({
      kind: "event",
      id: "offered",
      at: source.offeredAt,
      event: "offered",
    });
  }
  if (source.agreedAt) {
    items.push({
      kind: "event",
      id: "agreed",
      at: source.agreedAt,
      event: "agreed",
    });
  }
  for (const row of source.messages) {
    const side: RoomSide | "deleted" =
      row.authorId === null
        ? "deleted"
        : row.authorId === source.creatorId
          ? "creator"
          : "company";
    items.push({
      kind: "message",
      id: row.id,
      at: row.createdAt,
      side,
      mine: row.authorId === source.viewerId,
      body: row.hiddenAt ? null : row.body,
      hidden: row.hiddenAt !== null,
    });
  }
  return items.sort(
    (a, b) =>
      a.at.localeCompare(b.at) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}
