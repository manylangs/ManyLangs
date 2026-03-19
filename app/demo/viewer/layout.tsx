import { ViewerTargetProvider } from "@/app/viewer/context/ViewerTargetContext";

export default function DemoViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewerTargetProvider>
      {children}
    </ViewerTargetProvider>
  );
}