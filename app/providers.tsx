'use client'

import { ClerkProvider } from "@clerk/nextjs";
import { ViewerTargetProvider } from "@/app/viewer/context/ViewerTargetContext";
import { useEffect } from "react";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("CLERK KEY:", clerkKey);

    const w = window as any;

    if (!w.ResizeObserver) {
      w.ResizeObserver = function () {
        return {
          observe() { },
          unobserve() { },
          disconnect() { },
        };
      };
    }

    if (!w.IntersectionObserver) {
      w.IntersectionObserver = function () {
        return {
          observe() { },
          unobserve() { },
          disconnect() { },
        };
      };
    }

    if (!w.matchMedia) {
      w.matchMedia = () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
      });
    }

    if (!w.navigation) {
      w.navigation = {
        addEventListener() { },
        removeEventListener() { },
      };
    }

    if (!w.scheduler) {
      w.scheduler = {
        postTask: (cb: () => void) => setTimeout(cb, 0),
      };
    }

  }, [clerkKey]);

  // 🔥 key 없으면 바로 에러 로그
  if (!clerkKey) {
    console.error("❌ Clerk publishable key is missing!");
  }

  return (
    <ClerkProvider
      publishableKey="pk_live_Y2xlcmsubWFueWxhbmdzLnN0dWRpbyQ"
      appearance={{}}
      signInForceRedirectUrl="/select-books"
      signUpForceRedirectUrl="/select-books"
    >
      <ViewerTargetProvider>
        {children}
      </ViewerTargetProvider>
    </ClerkProvider>
  );
}