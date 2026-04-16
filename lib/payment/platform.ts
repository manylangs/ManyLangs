export type PaymentPlatform = "android" | "ios" | "web";

function hasWindow() {
  return typeof window !== "undefined";
}

export function isAndroid(): boolean {
  if (!hasWindow()) return false;

  const ua = window.navigator.userAgent || "";
  const hasBridge =
    typeof (window as any).AndroidBridge?.purchase === "function";

  return hasBridge || /Android/i.test(ua);
}

export function isIOS(): boolean {
  if (!hasWindow()) return false;

  const ua = window.navigator.userAgent || "";
  const hasWebkitHandler =
    typeof (window as any).webkit?.messageHandlers?.purchase?.postMessage ===
    "function";

  return hasWebkitHandler || /iPhone|iPad|iPod/i.test(ua);
}

export function isWeb(): boolean {
  return !isAndroid() && !isIOS();
}

export function detectPaymentPlatform(): PaymentPlatform {
  if (isAndroid()) return "android";
  if (isIOS()) return "ios";
  return "web";
}
