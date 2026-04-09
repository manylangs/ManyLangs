import { ReactNode } from "react";
import ViewerHeaderClient from "./components/ViewerHeaderClient";
import { ViewerTargetProvider } from "./context/ViewerTargetContext";
import ViewerGuard from "./ViewerGuard";

export default function ViewerLayout({ children }: { children: ReactNode }) {
  return (
    <ViewerGuard>
      <ViewerTargetProvider>
        <ViewerHeaderClient />
        {children}
      </ViewerTargetProvider>
    </ViewerGuard>
  );
}