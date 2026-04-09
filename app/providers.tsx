'use client'

import { ClerkProvider } from "@clerk/nextjs";
import { ViewerTargetProvider } from "@/app/viewer/context/ViewerTargetContext";
import { useEffect } from "react";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;

    if (!w.ResizeObserver) {
      w.ResizeObserver = function () {
        return {
          observe() {},
          unobserve() {},
          disconnect() {},
        };
      };
    }

    if (!w.IntersectionObserver) {
      w.IntersectionObserver = function () {
        return {
          observe() {},
          unobserve() {},
          disconnect() {},
        };
      };
    }

    if (!w.matchMedia) {
      w.matchMedia = () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });
    }

    if (!w.navigation) {
      w.navigation = {
        addEventListener() {},
        removeEventListener() {},
      };
    }

    if (!w.scheduler) {
      w.scheduler = {
        postTask: (cb: () => void) => setTimeout(cb, 0),
      };
    }

  }, []);

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ViewerTargetProvider>
        {children}
      </ViewerTargetProvider>
    </ClerkProvider>
  );
}