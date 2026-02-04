import { ReactNode } from "react";
import ViewerHeaderClient from "./components/ViewerHeaderClient";
import { ViewerTargetProvider } from "./context/ViewerTargetContext";

export default function ViewerLayout({ children }: { children: ReactNode }) {
  return (
    <ViewerTargetProvider>
      <ViewerHeaderClient />
      {children}
    </ViewerTargetProvider>
  );
}
