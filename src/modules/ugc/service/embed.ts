/**
 * The player address of a video a creator linked (U5, D578). Only the three
 * platforms the room allows get one; any other link stays a plain link.
 * The id must match a strict pattern, so nothing else reaches the frame.
 */
const ID = /^[\w-]{6,20}$/;

export function videoEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  if (host === "tiktok.com") {
    const id = url.pathname.match(/\/video\/(\d+)/)?.[1];
    return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtube.com") {
    const id = url.searchParams.get("v") ?? "";
    return ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "instagram.com") {
    const match = url.pathname.match(/\/(p|reel)\/([\w-]+)/);
    return match
      ? `https://www.instagram.com/${match[1]}/${match[2]}/embed`
      : null;
  }
  return null;
}
