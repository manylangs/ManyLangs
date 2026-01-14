"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SelectBooksPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  // 🔒 로그인 + 라이선스 가드 (핵심)
  useEffect(() => {
    if (!isLoaded) return;

    // 비로그인 → 로그인
    if (!userId) {
      router.replace("/login");
      return;
    }

    // 이미 라이선스 있음 → Viewer로 즉시 이동
    const licensed = localStorage.getItem("licensed");
    if (licensed === "true") {
      router.replace("/viewer/kr/grammar/a1/001");
    }
  }, [isLoaded, userId, router]);

  // 로딩 중 / 리다이렉트 직전 렌더 방지
  if (!isLoaded || !userId) {
    return null;
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>교재 선택</h2>

      <Link href="/viewer/kr/grammar/a1/001">
        한국어 문법 A1
      </Link>
    </main>
  );
}
