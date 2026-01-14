"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("licensed") !== "true") {
      router.replace("/checkout");
    }
  }, [router]);

  return <>{children}</>;
}
