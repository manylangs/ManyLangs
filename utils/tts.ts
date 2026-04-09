export const speakText = (text: string, lang: string) => {
  if (!text) return;
  if (typeof window === "undefined") return;

  // Android
  if ((window as any).AndroidBridge?.speak) {
    (window as any).AndroidBridge.speak(text, lang);
    return;
  }

  // iOS
  if ((window as any).webkit?.messageHandlers?.speak) {
    (window as any).webkit.messageHandlers.speak.postMessage({ text, lang });
    return;
  }

  // Web
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(text);

    const map: any = {
      kr: "ko-KR",
      ko: "ko-KR",
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      pt: "pt-PT",
    };

    u.lang = map[lang] || "en-US";

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
};