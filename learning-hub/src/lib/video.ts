/** Converts a YouTube or Google Drive web link into an embeddable URL. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    let provider: "youtube" | "drive" = "youtube";
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (/^\/(embed|shorts)\//.test(u.pathname)) id = u.pathname.split("/")[2];
      else if (u.pathname === "/watch") id = u.searchParams.get("v");
    } else if (host === "drive.google.com") {
      provider = "drive";
      id = u.pathname.match(/^\/file\/d\/([^/]+)(?:\/|$)/)?.[1] ?? u.searchParams.get("id");
    } else return null;
    // IDs must stay a single path segment: no empty IDs, traversal, query, or fragment injection.
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return provider === "drive" ? `https://drive.google.com/file/d/${id}/preview` : `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

export const videoSource = (url: string) => {
  try { return new URL(url).hostname === "drive.google.com" ? "Google Drive" : "YouTube"; }
  catch { return "YouTube"; }
};
