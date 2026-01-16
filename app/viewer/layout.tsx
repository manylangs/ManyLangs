"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LicenseHeader from "@/app/viewer/components/LicenseHeader";

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

    if (!licensed) {
      router.replace("/checkout");
      return;
    }

    if (!storedExpiresAt) {
      router.replace("/login");
      return;
    }

    const exp = Number(storedExpiresAt);
    setExpiresAt(exp);

    if (Date.now() > exp) {
      router.replace("/login");
    }
  }, [router]);

  // ⏳ expiresAt 로딩 중 UX (추가됨)
  if (expiresAt === null) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "#666",
        }}
      >
        Loading textbook...
      </div>
    );
  }

  return (
    <>
      <LicenseHeader expiresAt={expiresAt} />
      {children}
    </>
  );
}
