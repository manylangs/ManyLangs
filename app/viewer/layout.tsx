"use client";

import ViewerGuard from "@/app/viewer/ViewerGuard";
import LicenseHeader from "@/app/viewer/components/LicenseHeader";
import ViewerHeader from "@/app/viewer/components/ViewerHeader";

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewerGuard>
      {/* expiresAt은 STEP 2에서 다시 연결 */}
      <LicenseHeader expiresAt={null} />
      <ViewerHeader />
      {children}
    </ViewerGuard>
  );
}
