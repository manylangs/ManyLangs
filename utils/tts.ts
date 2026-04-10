export const speakText = (text: string, lang: string) => {
  if (!text) return;
  if (typeof window === "undefined") return;

  const map: Record<string, string> = {
    kr: "ko-KR",
    ko: "ko-KR",
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    pt: "pt-PT",
  };

  const mappedLang = map[lang] || "en-US";

  console.log("speakText called:", text, lang, "→", mappedLang);
  console.log("AndroidBridge:", (window as any).AndroidBridge);

  // ✅ Android
  if ((window as any).AndroidBridge?.speak) {
    (window as any).AndroidBridge.speak(text, mappedLang);
    return;
  }

  // ✅ iOS
  if ((window as any).webkit?.messageHandlers?.speak) {
    (window as any).webkit.messageHandlers.speak.postMessage({
      text,
      lang: mappedLang,
    });
    return;
  }

  // ✅ Web (fallback) 🔥 수정됨
  const synth = window.speechSynthesis;

  if (synth) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = mappedLang;

    synth.cancel?.();   // 🔥 핵심
    synth.speak?.(u);   // 🔥 안전
  }
};