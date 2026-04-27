"use client";

import { ReactNode } from "react";
import ViewerHeaderClient from "./components/ViewerHeaderClient";
import { ViewerTargetProvider } from "./context/ViewerTargetContext";
import ViewerGuard from "./ViewerGuard";

export default function ViewerLayout({ children }: { children: ReactNode }) {
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