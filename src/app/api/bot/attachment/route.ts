import {
  readFormDataLimited,
  toErrorResponse,
  validationError,
} from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import {
  ATTACHMENT_MAX_BYTES,
  extractAttachmentText,
} from "@/modules/bot/service";

/** Room for the multipart envelope around the file. */
const FORM_OVERHEAD_BYTES = 64 * 1024;

/**
 * `POST /api/bot/attachment` — reads a file attached in the chat and
 * returns its text (TZ 53). Nothing is stored; the chat sends the text with
 * the next message, and the profile changes only through Spoki's card.
 */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("botAttachment", clientIp(request.headers));
    const form = await readFormDataLimited(
      request,
      ATTACHMENT_MAX_BYTES + FORM_OVERHEAD_BYTES,
    );
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw validationError([{ path: ["file"], message: "required" }]);
    }
    const name = file.name.slice(0, 200);
    const text = await extractAttachmentText({
      name,
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return Response.json({ name, text });
  } catch (error) {
    return toErrorResponse(error);
  }
}
