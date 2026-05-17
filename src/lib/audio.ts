/**
 * Chinese audio playback with Edge-TTS pregenerated mp3s.
 *
 * The build pipeline (`scripts/generate_audio.py`) emits one mp3 per char
 * and per word into `public/audio/{chars,words}/{codepoint-hex}.mp3`.
 *
 * `playChinese(text)` tries the pregenerated file first; if it 404s
 * or the runtime cannot play it (e.g. some restricted webviews), we
 * fall back to `SpeechSynthesisUtterance` so behaviour degrades gracefully.
 *
 * Use this everywhere instead of `new SpeechSynthesisUtterance` directly.
 */

function codepointName(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) continue;
    if (cp > 0xffff) {
      // Surrogate pair — codePointAt returns the full pair from i, so skip the trail.
      i++;
    }
    if (out.length > 0) out += "-";
    out += cp.toString(16);
  }
  return out;
}

const CHAR_RE = /^[\u3400-\u9fff]$/;

/** Returns the public URL for a pregenerated mp3, or null if unsupported. */
export function audioUrl(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  if (!clean) return null;
  for (const ch of clean) {
    if (!(ch >= "\u3400" && ch <= "\u9fff")) return null;
  }
  const folder = clean.length === 1 && CHAR_RE.test(clean) ? "chars" : "words";
  return `/audio/${folder}/${codepointName(clean)}.mp3`;
}

const missing = new Set<string>();
const cache = new Map<string, HTMLAudioElement>();
let currentAudio: HTMLAudioElement | null = null;

function fallbackSpeak(text: string): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}

function stopCurrent(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }
}

/**
 * Play the Chinese pronunciation of `text`.
 *
 * Returns a promise that resolves when playback either starts (mp3 path)
 * or has been queued (TTS fallback). It never rejects on routine errors —
 * the worst case is a silent UI button, never a console explosion.
 */
export async function playChinese(text: string): Promise<void> {
  if (typeof window === "undefined") return;
  const url = audioUrl(text);
  if (!url || missing.has(url)) {
    fallbackSpeak(text);
    return;
  }

  stopCurrent();

  let audio = cache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    cache.set(url, audio);
  }

  try {
    audio.currentTime = 0;
    currentAudio = audio;
    await audio.play();
  } catch (err) {
    // Most common failure: 404 on a char/word we did not pregenerate, or
    // autoplay restrictions before the first user gesture. Fallback in
    // both cases; if it was a 404 remember it so we stop retrying.
    if (audio.error && audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      missing.add(url);
      cache.delete(url);
    } else if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      missing.add(url);
      cache.delete(url);
    } else {
      // AbortError happens when a second play() comes in fast — that's not a real failure.
      const name = (err as { name?: string } | null)?.name;
      if (name === "AbortError") return;
    }
    fallbackSpeak(text);
  }
}

/** Backwards-compatible alias for old call sites. */
export function speakChinese(text: string): void {
  void playChinese(text);
}

/** Preload one or more mp3s into the browser cache. */
export function preloadAudio(...texts: string[]): void {
  if (typeof window === "undefined") return;
  for (const text of texts) {
    const url = audioUrl(text);
    if (!url || missing.has(url) || cache.has(url)) continue;
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    cache.set(url, a);
  }
}
