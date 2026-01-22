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

/* ================= types ================= */

type LibraryItem = {
  lang: string;
  series: string;
  level: string;
  expiresAt: number;
  source: "coupon" | "payment";
};

type UsedCoupon = {
  code: string;
  usedAt: number;
};

type CouponItem = {
  code: string;
  used: boolean;
  expiresAt: number;
};

/* ================= constants ================= */

const LANGUAGE_OPTIONS = [
  { value: "kr", label: "Korean" },
  { value: "en", label: "English" },
];

const SERIES_CONFIG: Record<string, { label: string; hasLevel: boolean }> = {
  grammar: { label: "Grammar", hasLevel: true },
  conversation: { label: "Conversation", hasLevel: true },
  real: { label: "Real", hasLevel: true },
  voca: { label: "Vocabulary", hasLevel: false },
  idiom: { label: "Idiom", hasLevel: false },
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PAGE_SIZE = 10;

/* ================= page ================= */

export default function SelectBooksPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<UsedCoupon[]>([]);
  const [couponBox, setCouponBox] = useState<CouponItem[]>([]);
  const [couponPage, setCouponPage] = useState(0);

  const [targetLang, setTargetLang] = useState("kr");
  const [book, setBook] = useState("");
  const [level, setLevel] = useState("");
  const [coupon, setCoupon] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------- load local data ---------- */
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace("/login");
      return;
    }

    try {
      setLibrary(JSON.parse(localStorage.getItem("library") || "[]"));
      setUsedCoupons(
        JSON.parse(localStorage.getItem("usedCoupons") || "[]")
      );
      setCouponBox(
        JSON.parse(localStorage.getItem("couponBox") || "[]")
      );
    } catch {
      setLibrary([]);
      setUsedCoupons([]);
      setCouponBox([]);
    }

    // 결제 성공 콜백
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      const lang = params.get("lang")!;
      const series = params.get("series")!;
      const level = params.get("level")!;

      setLibrary(prev => {
        const exists = prev.find(
          i => i.lang === lang && i.series === series && i.level === level
        );
        if (exists) return prev;

        const next: LibraryItem[] = [
          ...prev,
          {
            lang,
            series,
            level,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
            source: "payment",
          },
        ];
        localStorage.setItem("library", JSON.stringify(next));
        return next;
      });

      window.history.replaceState({}, "", "/select-books");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded || !userId) return null;

  /* ---------- coupon redeem ---------- */

  async function activateCoupon() {
    if (loading) return;
    setError("");
    setLoading(true);

    if (!coupon.trim() || !book || (SERIES_CONFIG[book].hasLevel && !level)) {
      setError("Please complete all fields.");
      setLoading(false);
      return;
    }

    const finalLevel = SERIES_CONFIG[book].hasLevel ? level : "all";

    try {
      // 1️⃣ 서버에서 쿠폰 검증
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.trim(), userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid coupon.");
        setLoading(false);
        return;
      }

      // 2️⃣ 중복 교재 체크
      const already = library.find(
        i =>
          i.lang === targetLang &&
          i.series === book &&
          i.level === finalLevel
      );
      if (already) {
        setError("You already have this textbook.");
        setLoading(false);
        return;
      }

      // ✅ 안전한 상태 업데이트
      setLibrary(prev => {
        const next: LibraryItem[] = [
          ...prev,
          {
            lang: targetLang,
            series: book,
            level: finalLevel,
            expiresAt: data.expiresAt,
            source: "coupon",
          },
        ];
        localStorage.setItem("library", JSON.stringify(next));
        return next;
      });

      setUsedCoupons(prev => {
        const next = [...prev, { code: coupon.trim(), usedAt: Date.now() }];
        localStorage.setItem("usedCoupons", JSON.stringify(next));
        return next;
      });

      setCouponBox(prev => {
        const next = [
          ...prev,
          { code: coupon.trim(), used: true, expiresAt: data.expiresAt },
        ];
        localStorage.setItem("couponBox", JSON.stringify(next));
        return next;
      });

      setCoupon("");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- stripe payment ---------- */

  async function startPayment() {
    if (!book || (SERIES_CONFIG[book].hasLevel && !level)) {
      setError("Please select textbook and level.");
      return;
    }

    const finalLevel = SERIES_CONFIG[book].hasLevel ? level : "all";

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: targetLang,
        series: book,
        level: finalLevel,
      }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  /* ---------- viewer ---------- */

  function openBook(item: LibraryItem) {
    const levelPath = item.level === "all" ? "" : `/${item.level}`;
    router.push(`/viewer/${item.lang}/${item.series}${levelPath}/001`);
  }

  const filteredLibrary = library.filter(i => i.lang === targetLang);

  /* ================= render ================= */

  return (
    <main className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">

        {/* Language */}
        <Card>
          <CardContent className="pt-6">
            <select
              value={targetLang}
              onChange={e => setTargetLang(e.target.value)}
              className="w-full rounded border px-2 py-1"
            >
              {LANGUAGE_OPTIONS.map(l => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* My Library */}
        <Card>
          <CardHeader>
            <CardTitle>My Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredLibrary.map((item, idx) => (
              <div key={idx} className="flex justify-between rounded border px-3 py-2">
                <div className="text-sm">
                  {item.series.toUpperCase()}
                  {item.level !== "all" && ` · ${item.level.toUpperCase()}`}
                </div>
                <Button size="sm" onClick={() => openBook(item)}>
                  Open
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Add textbook */}
        <Card>
          <CardHeader>
            <CardTitle>Add a textbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={book}
              onChange={e => {
                const next = e.target.value;
                setBook(next);
                setLevel(SERIES_CONFIG[next]?.hasLevel ? "a1" : "");
              }}
              className="block w-full rounded border px-2 py-1"
            >
              <option value="">Select textbook</option>
              {Object.entries(SERIES_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            {book && SERIES_CONFIG[book].hasLevel && (
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="block w-full rounded border px-2 py-1"
              >
                {LEVELS.map(l => (
                  <option key={l} value={l.toLowerCase()}>
                    {l}
                  </option>
                ))}
              </select>
            )}

            <input
              value={coupon}
              onChange={e => setCoupon(e.target.value)}
              placeholder="Coupon code"
              className="block w-full rounded border px-2 py-1"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button onClick={activateCoupon} disabled={loading} className="w-full">
              Add with Coupon
            </Button>

            <Button variant="outline" onClick={startPayment} className="w-full">
              Buy with Card
            </Button>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
