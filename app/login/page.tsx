"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main style={{ padding: 24 }}>
      <h2>로그인</h2>
      <SignIn afterSignInUrl="/checkout" />
    </main>
  );
}
