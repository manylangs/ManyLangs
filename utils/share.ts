// ===== [START improved copyLink] =====
export function copyLink(url?: string, onCopy?: () => void) {
  const target =
    url || (typeof window !== "undefined" ? window.location.href : "");

  try {
    if (navigator.share) {
      navigator.share({ url: target }).catch(() => {});
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(target)
        .then(() => onCopy?.()) // 🔥 콜백
        .catch(() => onCopy?.());
      return;
    }

    onCopy?.();

  } catch {
    onCopy?.();
  }
}
// ===== [END improved copyLink] =====