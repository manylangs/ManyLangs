"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Logo from "@/app/components/Logo";

export default function LoginPage() {
  const { isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Logo />
      <SignIn /> {/* 👈 이거 있어야 테스트 가능 */}
    </main>
  );
}