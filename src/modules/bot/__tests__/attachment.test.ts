import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_CHARS,
  extractAttachmentText,
} from "../service";

const bytes = (text: string) => new TextEncoder().encode(text);

/** A one-page PDF with one line of text, offsets computed so it is valid. */
function tinyPdf(line: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${line}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return bytes(body);
}

describe("chat attachments (TZ 53)", () => {
  it("reads the text of a PDF", async () => {
    const text = await extractAttachmentText({
      name: "cv.pdf",
      type: "application/pdf",
      bytes: tinyPdf("Jane Doe React developer"),
    });
    expect(text).toContain("Jane Doe React developer");
  });

  it("reads a text file and tidies its blank lines", async () => {
    const text = await extractAttachmentText({
      name: "notes.md",
      type: "",
      bytes: bytes("Skills:\r\n\r\n\r\n\r\nReact  \nTypeScript\n"),
    });
    expect(text).toBe("Skills:\n\nReact\nTypeScript");
  });

  it("keeps only what the model reads", async () => {
    const text = await extractAttachmentText({
      name: "long.txt",
      type: "text/plain",
      bytes: bytes("a".repeat(ATTACHMENT_MAX_CHARS + 500)),
    });
    expect(text).toHaveLength(ATTACHMENT_MAX_CHARS);
  });

  it.each([
    ["photo.png", "image/png", bytes("png"), "ATTACHMENT_TYPE"],
    ["empty.txt", "text/plain", new Uint8Array(), "ATTACHMENT_EMPTY"],
    [
      "big.txt",
      "text/plain",
      new Uint8Array(ATTACHMENT_MAX_BYTES + 1),
      "ATTACHMENT_TOO_LARGE",
    ],
    ["blank.txt", "text/plain", bytes(" \n\n "), "ATTACHMENT_NO_TEXT"],
    [
      "broken.pdf",
      "application/pdf",
      bytes("not a pdf"),
      "ATTACHMENT_UNREADABLE",
    ],
  ])("refuses %s", async (name, type, content, code) => {
    await expect(
      extractAttachmentText({ name, type, bytes: content }),
    ).rejects.toMatchObject({ status: 422, code });
  });
});
