/**
 * Minimal text-to-speech helper for Chinese characters.
 *
 * Uses the browser's built-in SpeechSynthesis. Voice quality varies by
 * platform — on Safari iOS the default zh-CN voice is good; on
 * desktop Chrome it falls back to a system voice which can sound flat.
 * No-op when called from SSR or from a browser without the API.
 */
export function speakChinese(text: string): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.8;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
