"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ViewerGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // 1️⃣ 비로그인 차단
    if (!userId) {
      router.replace("/login");
      return;
    }

    // 2️⃣ 라이선스 존재 여부
    const licensed = localStorage.getItem("licensed");
    if (licensed !== "true") {
      router.replace("/select-books");
      return;
    }

    // 3️⃣ 라이선스 만료 체크 (추가)
    const expiresAt = localStorage.getItem("expiresAt");
    if (!expiresAt || Date.now() > Number(expiresAt)) {
      router.replace("/login");
      return;
    }
  }, [isLoaded, userId, router]);

  // 판정 중 렌더 차단
  if (!isLoaded || !userId) return null;

  return <>{children}</>;
}
