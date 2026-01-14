"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <main style={{ padding: 24 }}>
      <h2>회원가입</h2>
      <SignUp routing="hash" afterSignUpUrl="/checkout" />
    </main>
  );
}
