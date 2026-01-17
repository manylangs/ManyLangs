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

type LibraryItem = {
  lang: string;
  series: string;
  level: string;
  expiresAt: number;
};

const LANGUAGE_OPTIONS = [
  { value: "kr", label: "Korean" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
];

export default function SelectBooksPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [targetLang, setTargetLang] = useState("kr");

  const [book, setBook] = useState("grammar");
  const [level, setLevel] = useState("a1");
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔒 로그인 가드 + 라이브러리 로드
  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    const raw = localStorage.getItem("library");
    if (raw) {
      try {
        const parsed: LibraryItem[] = JSON.parse(raw);
        setLibrary(parsed);

        // 기본 언어 설정: 라이브러리에 있으면 첫 언어
        if (parsed.length > 0) {
          setTargetLang(parsed[0].lang);
        }
      } catch {
        setLibrary([]);
      }
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded || !userId) return null;

  function saveLibrary(next: LibraryItem[]) {
    setLibrary(next);
    localStorage.setItem("library", JSON.stringify(next));
  }

  async function activateCoupon() {
    if (loading) return;

    setError("");
    setLoading(true);

    if (!coupon.trim()) {
      setError("Please enter a coupon code.");
      setLoading(false);
      return;
    }

    // 🔍 중복 교재 체크 (언어 포함)
    const existing = library.find(
      item =>
        item.lang === targetLang &&
        item.series === book &&
        item.level === level
    );

    if (existing) {
      setError(
        `You already have this textbook. It expires on ${new Date(
          existing.expiresAt
        ).toLocaleDateString()}.`
      );
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

      const newItem: LibraryItem = {
        lang: targetLang,
        series: book,
        level,
        expiresAt: data.expiresAt,
      };

      saveLibrary([...library, newItem]);

      // legacy (7-2-1에서 제거 예정)
      localStorage.setItem("licensed", "true");
      localStorage.setItem("expiresAt", String(data.expiresAt));

      setCoupon("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function openBook(item: LibraryItem) {
    router.push(
      `/viewer/${item.lang}/${item.series}/${item.level}/001`
    );
  }

  const filteredLibrary = library.filter(
    item => item.lang === targetLang
  );

  return (
    <main className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* 🌐 Language to Study */}
        <Card>
          <CardContent className="space-y-2 pt-6">
            <label className="text-sm font-medium">
              Language to Study
            </label>
            <select
              value={targetLang}
              onChange={e => {
                setTargetLang(e.target.value);
                setError("");
              }}
              disabled={loading}
              className="block w-full rounded border px-2 py-1"
            >
              {LANGUAGE_OPTIONS.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* 📚 My Library */}
        <Card>
          <CardHeader>
            <CardTitle>My Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredLibrary.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No textbooks for this language.
              </p>
            )}

            {filteredLibrary.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <div className="text-sm">
                  <div>
                    {item.series.toUpperCase()} ·{" "}
                    {item.level.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires:{" "}
                    {new Date(item.expiresAt).toLocaleDateString()}
                  </div>
                </div>

                <Button size="sm" onClick={() => openBook(item)}>
                  Open
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ➕ Add a textbook */}
        <Card>
          <CardHeader>
            <CardTitle>Add a textbook</CardTitle>
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
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              onClick={activateCoupon}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Activating..." : "Add to Library"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
