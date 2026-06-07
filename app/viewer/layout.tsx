"use client";

import { ReactNode } from "react";
import ViewerHeaderClient from "./components/ViewerHeaderClient";
import { ViewerTargetProvider } from "./context/ViewerTargetContext";
import ViewerGuard from "./ViewerGuard";
import ViewerWatermark from "./components/ViewerWatermark";

export default function ViewerLayout({ children }: { children: ReactNode }) {
  return (
    <ViewerGuard>
      <ViewerTargetProvider>
        <ViewerHeaderClient />
        <ViewerWatermark />
        <div style={{ paddingTop: "56px", paddingBottom: "36px", minHeight: "100dvh" }}>
          {children}
        </div>
      </ViewerTargetProvider>
    </ViewerGuard>
  );
}