import { describe, expect, it } from "vitest";
import { readBodyLimited, readFormDataLimited } from "./body-limit";

function streamRequest(chunks: Uint8Array[], headers: HeadersInit = {}) {
  let pulled = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const next = chunks[pulled];
        pulled += 1;
        if (next) controller.enqueue(next);
        else controller.close();
      },
    },
    // Pull only when the reader asks, so the test can count reads.
    { highWaterMark: 0 },
  );
  const request = new Request("http://localhost/upload", {
    method: "POST",
    headers,
    body,
    // Node needs this for a streamed request body.
    duplex: "half",
  } as RequestInit);
  return { request, pulled: () => pulled };
}

describe("readBodyLimited", () => {
  it("returns a body within the limit", async () => {
    const { request } = streamRequest([
      new Uint8Array([1, 2]),
      new Uint8Array([3]),
    ]);
    expect(Array.from(await readBodyLimited(request, 3))).toEqual([1, 2, 3]);
  });

  it("refuses a declared Content-Length over the limit without reading", async () => {
    const { request, pulled } = streamRequest([new Uint8Array(10)], {
      "content-length": "10",
    });
    await expect(readBodyLimited(request, 5)).rejects.toMatchObject({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
    expect(pulled()).toBe(0);
  });

  it("stops reading a stream as soon as it passes the limit", async () => {
    const chunks = Array.from({ length: 100 }, () => new Uint8Array(1024));
    const { request, pulled } = streamRequest(chunks);
    await expect(readBodyLimited(request, 4096)).rejects.toMatchObject({
      status: 413,
    });
    expect(pulled()).toBeLessThan(10);
  });
});

describe("readFormDataLimited", () => {
  it("parses multipart data within the limit", async () => {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(100)]), "logo.png");
    const request = new Request("http://localhost/upload", {
      method: "POST",
      body: form,
    });
    const parsed = await readFormDataLimited(request, 10_000);
    expect((parsed.get("file") as File).size).toBe(100);
  });

  it("answers 400 for a body that is not multipart", async () => {
    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body: "not multipart",
    });
    await expect(readFormDataLimited(request, 10_000)).rejects.toMatchObject({
      status: 400,
    });
  });
});
