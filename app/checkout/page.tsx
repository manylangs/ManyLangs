"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { isLoaded } = useAuth();
  const { isSignedIn } = useUser(); // ✅ 추가
  const router = useRouter();

  // 🔒 비로그인 + 재결제 접근 차단
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    // 이미 라이선스 있음 → 재결제 방지
    const licensed = localStorage.getItem("licensed");
    if (licensed === "true") {
      router.replace("/select-books");
      return;
    }
  }, [isLoaded, isSignedIn, router]); // ✅ userId 제거

  const startCheckout = async () => {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  // 🔥 auth 로딩 중 / 비로그인 시 렌더 차단
  if (!isLoaded) return null;
  if (!isSignedIn) return null;

  return (
    <main style={{ padding: 24 }}>
      <h2>결제 페이지</h2>
      <button onClick={startCheckout}>
        Stripe 결제하기
      </button>
    </main>
  );
}