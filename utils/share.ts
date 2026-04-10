export function copyLink(url?: string) {
  const target =
    url || (typeof window !== "undefined" ? window.location.href : "");

  try {
    // 🔥 1순위: 공유 UI
    if (navigator.share) {
      navigator.share({
        url: target,
      }).catch(() => {});
      return;
    }

    // 🔥 2순위: 클립보드
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(target)
        .then(() => alert("Link copied!"))
        .catch(() => alert("Link copied!"));
      return;
    }

    // 🔥 fallback
    alert(target);

  } catch {
    alert(target);
  }
}