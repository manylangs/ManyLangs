"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut().then(() => {
      router.replace("/");
    });
  }, [signOut, router]);

  return (
    <div style={{ padding: 24 }}>
      Logging out...
    </div>
  );
}
