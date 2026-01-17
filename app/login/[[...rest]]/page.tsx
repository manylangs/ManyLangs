"use client";

import { SignIn } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import Logo from "@/app/components/Logo";

export default function LoginPage() {
  const { isLoaded } = useUser();

  // 로그인 상태에 따른 리다이렉트는
  // Clerk <SignIn> 컴포넌트에게만 맡긴다
  // (Viewer 자동 복원 방지)
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
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>
        Sign in to your account
      </h1>

      <SignIn
        redirectUrl="/select-books"
        afterSignInUrl="/select-books"
      />
    </main>
  );
}
