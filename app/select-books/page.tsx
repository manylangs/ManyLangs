"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";

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

      localStorage.setItem("licensed", "true");
      localStorage.setItem("expiresAt", String(data.expiresAt));

      router.replace(`/viewer/kr/${book}/${level}/001`);
    } catch (e) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex justify-center px-4 py-8">
      <Card className="w-full max-w-md hover:shadow-sm transition-shadow">
        <CardHeader>
          <CardTitle>Select a textbook</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label>Textbook</label>
            <select
              value={book}
              onChange={e => setBook(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded border px-2 py-1"
            >
              <option value="grammar">Grammar</option>
              <option value="conversation">Conversation</option>
            </select>
          </div>

          <div>
            <label>Level</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded border px-2 py-1"
            >
              <option value="a1">A1</option>
              <option value="a2">A2</option>
              <option value="b1">B1</option>
            </select>
          </div>

          <div>
            <label>Coupon code</label>
            <input
              value={coupon}
              onChange={e => setCoupon(e.target.value)}
              disabled={loading}
              placeholder="Enter your coupon code"
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            onClick={activateCoupon}
            disabled={loading}
            className={`w-full ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {loading ? "Activating..." : "Activate & Start Learning"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
