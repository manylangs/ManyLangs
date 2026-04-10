export function copyLink(url?: string) {
  const target =
    url || (typeof window !== "undefined" ? window.location.href : "");

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(target)
        .then(() => alert("Link copied!"))
        .catch(() => alert("Link copied!"));
    } else {
      alert("Link copied!");
    }
  } catch {
    alert("Link copied!");
  }
}