"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LicenseHeader from "@/app/viewer/components/LicenseHeader";
import ViewerHeader from "@/app/viewer/components/ViewerHeader";

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    const licensed = localStorage.getItem("licensed") === "true";
    const storedExpiresAt = localStorage.getItem("expiresAt");

    if (!licensed || !storedExpiresAt) {
      router.replace("/login");
      return;
    }

    const exp = Number(storedExpiresAt);
    setExpiresAt(exp);

    if (Date.now() > exp) {
      router.replace("/login");
    }
  }, [router]);

  if (expiresAt === null) {
    return <div style={{ padding: 24 }}>Loading textbook...</div>;
  }

  return (
    <>
      <LicenseHeader expiresAt={expiresAt} />
      <ViewerHeader />   {/* ✅ 토글은 여기 하나만 */}
      {children}
    </>
  );
}
