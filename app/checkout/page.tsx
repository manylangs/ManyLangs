"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  // 🔒 비로그인 + 재결제 접근 차단
  useEffect(() => {
    if (!isLoaded) return;

    // 1️⃣ 비로그인 차단
    if (!userId) {
      router.replace("/login");
      return;
    }

    // 2️⃣ 이미 라이선스 있음 → 재결제 차단
    const licensed = localStorage.getItem("licensed");
    if (licensed === "true") {
      router.replace("/select-books");
      return;
    }
  }, [isLoaded, userId, router]);

  const startCheckout = async () => {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  // 가드 처리 중에는 렌더링 안 함
  if (!isLoaded || !userId) {
    return null;
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>결제 페이지</h2>
      <button onClick={startCheckout}>
        Stripe 결제하기
      </button>
    </main>
  );
}
