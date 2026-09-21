// Links handed to participants must never point at an editor preview host.
const PUBLISHED_ORIGIN = "https://debriefs.lovable.app";

export function shareOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  const host = window.location.hostname;
  const isPreview =
    host.includes("id-preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.dev") ||
    host === "localhost";
  return isPreview ? PUBLISHED_ORIGIN : window.location.origin;
}
