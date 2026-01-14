"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function SelectBooksPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      localStorage.setItem("licensed", "true");
    }
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h2>교재 선택</h2>
      <Link href="/viewer/kr/grammar/a1/001">한국어 문법 A1</Link>
    </main>
  );
}
