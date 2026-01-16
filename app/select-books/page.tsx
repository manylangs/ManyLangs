"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SelectBooksPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  const [book, setBook] = useState("grammar");
  const [level, setLevel] = useState("a1");
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔒 로그인 + 라이선스 가드
  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    const licensed = localStorage.getItem("licensed");
    if (licensed === "true") {
      router.replace("/viewer/kr/grammar/a1/001");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded || !userId) return null;

  async function activateCoupon() {
    if (loading) return;

    setError("");
    setLoading(true);

    if (!coupon.trim()) {
      setError("Please enter a coupon code.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon.trim(),
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to redeem coupon.");
        setLoading(false);
        return;
      }

      // ✅ 라이선스 저장 (클라이언트 가드용)
      localStorage.setItem("licensed", "true");
      localStorage.setItem("expiresAt", String(data.expiresAt));

      // ✅ Viewer 이동
      router.replace(`/viewer/kr/${book}/${level}/001`);
    } catch (e) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h2>Select a textbook</h2>

      <div style={{ marginTop: 16 }}>
        <label>Textbook</label>
        <select
          value={book}
          onChange={e => setBook(e.target.value)}
          disabled={loading}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        >
          <option value="grammar">Grammar</option>
          <option value="conversation">Conversation</option>
        </select>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Level</label>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          disabled={loading}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        >
          <option value="a1">A1</option>
          <option value="a2">A2</option>
          <option value="b1">B1</option>
        </select>
      </div>

      <div style={{ marginTop: 20 }}>
        <label>Coupon code</label>
        <input
          value={coupon}
          onChange={e => setCoupon(e.target.value)}
          disabled={loading}
          placeholder="Enter your coupon code"
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: 8,
          }}
        />
      </div>

      {error && (
        <p style={{ color: "red", marginTop: 8 }}>
          {error}
        </p>
      )}

      <button
        onClick={activateCoupon}
        disabled={loading}
        style={{
          marginTop: 24,
          padding: "10px 16px",
          width: "100%",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Activating..." : "Activate & Start Learning"}
      </button>
    </main>
  );
}
