/**
 * Vimeo poster frames.
 *
 * The funnel uses a click-to-load facade for both VSLs (see
 * LIGHTHOUSE_OPTIMIZATION_SOP.md §5) — the player iframe is only mounted on
 * click, so a still image stands in for it until then. Rather than shipping a
 * hand-made thumbnail that can drift from the video, we ask Vimeo for the
 * video's own poster frame via oEmbed. No API token required.
 *
 * Called from server components, so the request happens at build time and the
 * URL is inlined into the static HTML — zero runtime cost for the visitor.
 *
 * NOTE: this returns whatever poster the video is set to in Vimeo. To pin it
 * to a specific moment, open the video in Vimeo → Settings → Thumbnail →
 * "Choose from video" and scrub to the frame you want; this code will pick the
 * change up on the next build. There is no unauthenticated way to request an
 * arbitrary timecode.
 */

/** Vimeo oEmbed response — only the field we consume. */
interface VimeoOEmbed {
  thumbnail_url?: unknown;
}

export async function getVimeoPoster(
  videoId: string,
  fallback: string,
): Promise<string> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/${videoId}&width=1280`,
      // Baked in at build time alongside the statically prerendered page.
      { cache: "force-cache" },
    );
    if (!res.ok) return fallback;

    const data = (await res.json()) as VimeoOEmbed;
    const url = data.thumbnail_url;
    return typeof url === "string" && url.startsWith("https://") ? url : fallback;
  } catch {
    // Vimeo unreachable during the build — fall back to the bundled image so
    // the build never fails over a thumbnail.
    return fallback;
  }
}
