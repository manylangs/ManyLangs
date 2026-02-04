"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    localStorage.clear(); // 라이브러리, 라이선스 전부 정리
    signOut().then(() => {
      router.replace("/login");
    });
  }, [signOut, router]);

  return <p style={{ padding: 16 }}>Logging out...</p>;
}
