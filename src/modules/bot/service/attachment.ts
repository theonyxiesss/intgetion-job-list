import { HttpError } from "@/lib/http";

/** A file read into the chat (TZ 53): a CV, a portfolio, notes. */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
/** What the model reads of one file; a CV fits well under it. */
export const ATTACHMENT_MAX_CHARS = 12_000;

const TEXT_TYPES = new Set(["text/plain", "text/markdown"]);
const TEXT_EXTENSIONS = /\.(txt|md)$/i;
const PDF_EXTENSION = /\.pdf$/i;

function badFile(code: string, message: string): HttpError {
  return new HttpError(422, code, message);
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, ATTACHMENT_MAX_CHARS);
}

/**
 * The plain text of an attached PDF or text file. The file is read in
 * memory and never stored; only the text goes on to the conversation.
 */
export async function extractAttachmentText(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}): Promise<string> {
  if (file.bytes.byteLength === 0)
    throw badFile("ATTACHMENT_EMPTY", "The file is empty.");
  if (file.bytes.byteLength > ATTACHMENT_MAX_BYTES)
    throw badFile("ATTACHMENT_TOO_LARGE", "The file is larger than 4 MB.");
  let text: string;
  if (file.type === "application/pdf" || PDF_EXTENSION.test(file.name)) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    try {
      const pdf = await getDocumentProxy(new Uint8Array(file.bytes));
      text = (await extractText(pdf, { mergePages: true })).text;
    } catch {
      throw badFile("ATTACHMENT_UNREADABLE", "The PDF could not be read.");
    }
  } else if (TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.test(file.name)) {
    text = new TextDecoder("utf-8", { fatal: false }).decode(file.bytes);
  } else {
    throw badFile("ATTACHMENT_TYPE", "Only PDF, TXT and MD files are read.");
  }
  const tidied = tidy(text);
  if (!tidied)
    throw badFile("ATTACHMENT_NO_TEXT", "The file has no text to read.");
  return tidied;
}
