/**
 * VSL playback helpers (landing hero + thank-you hero).
 *
 * Covers three problems the Vimeo facade has to solve:
 *
 *  1. Fullscreen, cross-platform. iPhone Safari does not implement the
 *     Fullscreen API on arbitrary elements — only on a <video>, which is
 *     unreachable inside Vimeo's cross-origin iframe. So iOS gets a different
 *     mechanism (see buildVimeoSrc) from everything else.
 *
 *  2. Sound. `autoplay=1` alone is unreliable: when a browser blocks unmuted
 *     autoplay, Vimeo's player silently retries MUTED rather than not playing.
 *     forceUnmute() talks to the player over postMessage once it signals
 *     ready and puts the sound back on.
 *
 *  3. Intent. Clicking the poster plays inline; only the "Watch The Short
 *     Video Below" button opens fullscreen — so the src has to be built
 *     differently depending on which one was used.
 */

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

const VIMEO_ORIGIN = "https://player.vimeo.com";

/**
 * True on iOS, including iPadOS 13+ which reports itself as a Mac but exposes
 * touch events.
 */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return ua.includes("Mac") && "ontouchend" in document;
}

/**
 * Ask for fullscreen on `el`. Returns true if a request was actually issued.
 *
 * MUST be called synchronously inside the click handler — browsers only grant
 * fullscreen while a user gesture is being processed, and awaiting a state
 * update first loses that context.
 */
export function requestFullscreen(el: HTMLElement | null): boolean {
  if (!el) return false;

  const target = el as FullscreenCapableElement;
  const request =
    target.requestFullscreen ??
    target.webkitRequestFullscreen ??
    target.webkitRequestFullScreen ??
    target.mozRequestFullScreen ??
    target.msRequestFullscreen;

  if (typeof request !== "function") return false;

  try {
    const result = request.call(target);
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {
        // Denied — playback continues inline.
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the Vimeo embed URL.
 *
 * `muted=0` is explicit rather than relying on the default — combined with
 * forceUnmute() below it's what keeps sound on.
 *
 * `playsinline` is only dropped for a fullscreen-intent play on iOS: that is
 * Vimeo's documented way to hand playback to the iOS native fullscreen video
 * controller. For an inline play we always keep playsinline=1, otherwise iOS
 * would hijack the poster click into fullscreen too.
 */
export function buildVimeoSrc(
  baseUrl: string,
  opts?: { fullscreen?: boolean; color?: string },
): string {
  const color = opts?.color ?? "C9954D";
  const wantsFullscreen = opts?.fullscreen === true;
  const playsinline = wantsFullscreen && isIosDevice() ? "0" : "1";

  return (
    `${baseUrl}?autoplay=1&muted=0&title=0&byline=0&portrait=0` +
    `&playsinline=${playsinline}&color=${color}`
  );
}

/**
 * Force the player audible.
 *
 * Uses Vimeo's postMessage API directly rather than pulling in @vimeo/player —
 * the SDK is ~30KB of JS on a page whose LCP we've deliberately protected, and
 * three commands don't justify it.
 *
 * Returns a cleanup function that removes the listener.
 */
export function forceUnmute(iframe: HTMLIFrameElement | null): () => void {
  if (!iframe || typeof window === "undefined") return () => {};

  const send = (method: string, value?: unknown) => {
    try {
      iframe.contentWindow?.postMessage(
        JSON.stringify(value === undefined ? { method } : { method, value }),
        VIMEO_ORIGIN,
      );
    } catch {
      // Player not reachable yet — the ready handler retries.
    }
  };

  const onMessage = (e: MessageEvent) => {
    if (e.origin !== VIMEO_ORIGIN) return;

    let data: { event?: string } | null = null;
    try {
      data = typeof e.data === "string" ? JSON.parse(e.data) : (e.data as { event?: string });
    } catch {
      return;
    }
    if (!data || data.event !== "ready") return;

    // Order matters: unmute first, then raise the volume, then make sure it's
    // actually rolling (a blocked autoplay leaves it paused).
    send("setMuted", false);
    send("setVolume", 1);
    send("play");
  };

  window.addEventListener("message", onMessage);

  // Some browsers have the player ready before the listener attaches, so fire
  // one unprompted round as well.
  const kick = window.setTimeout(() => {
    send("setMuted", false);
    send("setVolume", 1);
    send("play");
  }, 350);

  return () => {
    window.removeEventListener("message", onMessage);
    window.clearTimeout(kick);
  };
}
