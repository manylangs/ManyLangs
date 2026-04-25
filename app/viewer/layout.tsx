"use client";

import { ReactNode, useEffect, useState } from "react";
import ViewerHeaderClient from "./components/ViewerHeaderClient";
import { ViewerTargetProvider } from "./context/ViewerTargetContext";
import ViewerGuard from "./ViewerGuard";

export default function ViewerLayout({ children }: { children: ReactNode }) {
  const [safeTop, setSafeTop] = useState(0);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:env(safe-area-inset-top,0px);left:0;width:1px;height:1px;visibility:hidden;pointer-events:none;";
    document.body.appendChild(el);
    const envTop = el.getBoundingClientRect().top;
    document.body.removeChild(el);

    if (envTop > 0) { setSafeTop(envTop); return; }
    if (window.screenY > 0) { setSafeTop(window.screenY); return; }
    const diff = window.screen.height - window.innerHeight;
    if (diff > 0 && diff < 100) setSafeTop(diff);
  }, []);

  return (
    <ViewerGuard>
      <ViewerTargetProvider>
        <ViewerHeaderClient />
        <div style={{ paddingTop: "56px", minHeight: "100dvh" }}>
          {children}
        </div>
      </ViewerTargetProvider>
    </ViewerGuard>
  );
}