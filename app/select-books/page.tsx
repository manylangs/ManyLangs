"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";

/* ================= types ================= */

type LibraryItem = {
  lang: string;
  series: string;
  level: string;
  expiresAt: number;
  source: "coupon" | "payment";
  code?: string;
  issuedAt?: number;
};

type CouponItem = {
  code: string;
  used: boolean;
  issuedAt?: number;
  usedAt?: number | null;
  usedBy?: string;

  usedLang?: string | null;
  usedSeries?: string | null;
  usedLevel?: string | null;
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

/* ================= utils ================= */

function normalizeExpiresAt(expiresAt: number) {
  if (!Number.isFinite(expiresAt)) return 0;
  if (expiresAt < 1e12) return expiresAt * 1000;
  return expiresAt;
}

function isExpired(expiresAt: number) {
  const t = normalizeExpiresAt(expiresAt);
  if (!t) return true;
  return t <= Date.now();
}

function getExpireLabel(expiresAt: number) {
  const normalized = normalizeExpiresAt(expiresAt);
  const remaining = normalized - Date.now();

  if (!normalized || remaining <= 0) return { text: "Expired", color: "#d00" };

  const totalMin = Math.floor(remaining / (1000 * 60));
  const days = Math.floor(totalMin / (60 * 24));

  if (days >= 1) return { text: `D-${days}`, color: "#555" };

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return { text: `${hh}:${mm}`, color: "#c60" };
}

function getCouponStatus(c: CouponItem) {
  if (c.used) return { text: "Used", color: "#999" };
  return { text: "Available", color: "#090" };
}

function formatUsedAt(ts?: number | null) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return "";
  }
}

function formatUsedBook(c: CouponItem) {
  if (!c.used) return "";
  if (!c.usedSeries) return "";
  const s = c.usedSeries.toUpperCase();
  const lv = c.usedLevel && c.usedLevel !== "all" ? ` · ${c.usedLevel.toUpperCase()}` : "";
  const l = c.usedLang ? ` (${c.usedLang.toUpperCase()})` : "";
  return `${s}${lv}${l}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

/* ================= page ================= */

export default function SelectBooksPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [couponBox, setCouponBox] = useState<CouponItem[]>([]);

  const [targetLang, setTargetLang] = useState("kr");
  const [book, setBook] = useState("");
  const [level, setLevel] = useState("");
  const [coupon, setCoupon] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 정책 변경: 만료되면 자연스럽게 사라짐
  // - library: 만료 license 자동 제거
  // - couponBox: used 쿠폰은 "유효한 license(code)"가 있을 때만 유지
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace("/login");
      return;
    }

    // 1) localStorage 로드
    let localLib: LibraryItem[] = [];
    let localCoupons: CouponItem[] = [];
    try {
      localLib = JSON.parse(localStorage.getItem("library") || "[]");
      localCoupons = JSON.parse(localStorage.getItem("couponBox") || "[]");
    } catch {
      localLib = [];
      localCoupons = [];
    }

    // ✅ 2) 만료 라이선스 제거
    const aliveLib = localLib.filter((x) => !isExpired(x.expiresAt));
    setLibrary(aliveLib);
    localStorage.setItem("library", JSON.stringify(aliveLib));

    // ✅ 3) 살아있는 라이선스가 사용한 쿠폰 코드 집합
    const aliveCouponCodes = new Set(
      aliveLib
        .filter((x) => x.source === "coupon" && x.code)
        .map((x) => x.code as string)
    );

    // ✅ 4) 쿠폰 정리: used 쿠폰은 라이선스가 살아있을 때만 유지
    const cleanedCoupons = localCoupons.filter((c) => {
      if (!c.used) return true;
      return aliveCouponCodes.has(c.code);
    });

    setCouponBox(cleanedCoupons);
    localStorage.setItem("couponBox", JSON.stringify(cleanedCoupons));

    // 5) 결제 성공 처리: /select-books?checkout=success&session_id=...
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkout === "success" && sessionId) {
      (async () => {
        try {
          setLoading(true);
          setError("");

          const res = await fetch("/api/checkout/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });

          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Checkout complete failed.");
            return;
          }

          const codes: string[] = Array.isArray(data.coupons) ? data.coupons : [];
          if (codes.length > 0) {
            setCouponBox((prev) => {
              const map = new Map(prev.map((c) => [c.code, c]));
              for (const code of codes) {
                if (!map.has(code)) map.set(code, { code, used: false });
              }
              const next = Array.from(map.values());
              localStorage.setItem("couponBox", JSON.stringify(next));
              return next;
            });
          }
        } catch {
          setError("Network error.");
        } finally {
          setLoading(false);
          window.history.replaceState({}, "", "/select-books");
        }
      })();
    }

    // 6) ✅ 서버 쿠폰 동기화 (webhook 발급 포함)
    // - 동기화 후에도 같은 규칙 적용(used 쿠폰은 유효 license가 있을 때만)
    ;(async () => {
      try {
        const res = await fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (!res.ok) return;

        const serverCoupons: CouponItem[] = Array.isArray(data.coupons) ? data.coupons : [];

        setCouponBox((prev) => {
          const map = new Map(prev.map((c) => [c.code, c]));
          for (const sc of serverCoupons) {
            const prevOne = map.get(sc.code);

            // 서버가 undefined/null로 덮어써도 기존값 보존
            const merged: CouponItem = {
              ...(prevOne ?? {}),
              ...sc,
              usedLang: sc.usedLang ?? prevOne?.usedLang ?? null,
              usedSeries: sc.usedSeries ?? prevOne?.usedSeries ?? null,
              usedLevel: sc.usedLevel ?? prevOne?.usedLevel ?? null,
            };

            map.set(sc.code, merged);
          }

          // ✅ used 쿠폰은 유효 license가 있을 때만
          const mergedList = Array.from(map.values()).filter((c) => {
            if (!c.used) return true;
            return aliveCouponCodes.has(c.code);
          });

          localStorage.setItem("couponBox", JSON.stringify(mergedList));
          return mergedList;
        });
      } catch {
        // ignore
      }
    })();
  }, [isLoaded, userId, router]);

  // ✅ (선택) 라이선스 기반 usedBook 보강
  // 정책상 만료되면 used 쿠폰이 사라지므로, 남아있는 used 쿠폰은 항상 유효 license가 존재함
  // 그래도 서버가 usedBook 필드를 안 주는 경우를 대비해 유지
  useEffect(() => {
    if (library.length === 0 || couponBox.length === 0) return;

    const byCode = new Map<string, LibraryItem>();
    for (const l of library) {
      if (l.source === "coupon" && l.code) byCode.set(l.code, l);
    }

    setCouponBox((prev) => {
      const next = prev.map((c) => {
        if (!c.used) return c;
        if (c.usedSeries && c.usedLevel && c.usedLang) return c;

        const lic = byCode.get(c.code);
        if (!lic) return c;

        return {
          ...c,
          usedLang: c.usedLang ?? lic.lang ?? null,
          usedSeries: c.usedSeries ?? lic.series ?? null,
          usedLevel: c.usedLevel ?? lic.level ?? null,
        };
      });

      localStorage.setItem("couponBox", JSON.stringify(next));
      return next;
    });
  }, [library]);

  if (!isLoaded || !userId) return null;

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
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon.trim(),
          userId,
          lang: targetLang,
          series: book,
          level: finalLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid coupon.");
        return;
      }

      const lic = data.license as LibraryItem | undefined;
      const cp = data.coupon as CouponItem | undefined;

      if (!lic || !lic.expiresAt) {
        setError("Redeem succeeded, but license missing.");
        return;
      }

      // ✅ 라이선스 저장 (중복 제거 후 추가)
      setLibrary((prev) => {
        const filtered = prev.filter(
          (x) => !(x.lang === lic.lang && x.series === lic.series && x.level === lic.level)
        );
        const next: LibraryItem[] = [...filtered, lic];
        localStorage.setItem("library", JSON.stringify(next));
        return next;
      });

      // ✅ 쿠폰 박스 업데이트(used + 교재명)
      setCouponBox((prev) => {
        const map = new Map(prev.map((c) => [c.code, c]));
        const k = lic.code ?? coupon.trim();
        const current = map.get(k);

        map.set(k, {
          ...(current ?? { code: k, used: false }),
          code: k,
          used: true,
          usedAt: cp?.usedAt ?? Date.now(),
          usedLang: lic.lang,
          usedSeries: lic.series,
          usedLevel: lic.level,
        });

        // ✅ used 쿠폰은 유효 license가 있을 때만 남기는데,
        // redeem 직후엔 당연히 유효하므로 그대로 유지
        const next = Array.from(map.values());
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
        userId,
        lang: targetLang,
        series: book,
        level: finalLevel,
      }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  function openBook(item: LibraryItem) {
    // 정책상 만료는 목록에서 사라지지만, 혹시 남아있으면 1차 차단
    if (isExpired(item.expiresAt)) {
      setError("Expired textbook. Please redeem a new coupon or purchase again.");
      return;
    }

    const levelPath = item.level === "all" ? "" : `/${item.level}`;
    router.push(`/viewer/${item.lang}/${item.series}${levelPath}/001`);
  }

  // ✅ 만료는 이미 제거됨. 언어만 필터.
  const filteredLibrary = library.filter((i) => i.lang === targetLang);

  return (
    <main className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Language */}
        <Card>
          <CardContent className="pt-6">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full rounded border px-2 py-1"
            >
              {LANGUAGE_OPTIONS.map((l) => (
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
            {filteredLibrary.length === 0 && (
              <p className="text-sm text-gray-500">No active textbooks.</p>
            )}
            {filteredLibrary.map((item, idx) => {
              const expire = getExpireLabel(item.expiresAt);

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div className="text-sm">
                    {item.series.toUpperCase()}
                    {item.level !== "all" && ` · ${item.level.toUpperCase()}`}
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 12, color: expire.color }}>{expire.text}</span>
                    <Button size="sm" onClick={() => openBook(item)}>
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* My Coupons */}
        <Card>
          <CardHeader>
            <CardTitle>My Coupons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {couponBox.length === 0 && (
              <p className="text-sm text-gray-500">No coupons available.</p>
            )}

            {couponBox.map((c, idx) => {
              const status = getCouponStatus(c);
              const usedAt = c.used ? formatUsedAt(c.usedAt) : "";
              const usedBook = formatUsedBook(c);

              return (
                <div
                  key={idx}
                  className="flex justify-between rounded border px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => copyToClipboard(c.code)}
                    className="text-left hover:underline"
                    title="Click to copy"
                  >
                    {c.code}
                  </button>

                  <div style={{ color: status.color, textAlign: "right" }}>
                    {status.text}
                    {c.used && usedAt ? ` · ${usedAt}` : ""}
                    {c.used && usedBook ? (
                      <div style={{ fontSize: 11, color: "#777" }}>{usedBook}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
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
              onChange={(e) => {
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
                onChange={(e) => setLevel(e.target.value)}
                className="block w-full rounded border px-2 py-1"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l.toLowerCase()}>
                    {l}
                  </option>
                ))}
              </select>
            )}

            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code"
              className="block w-full rounded border px-2 py-1"
            />

            <p className="text-xs text-gray-500">
              Coupons can be shared with others. However, ManyLangs cannot individually track
              whether a shared coupon has been used.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button onClick={activateCoupon} disabled={loading} className="w-full">
              {loading ? "Processing..." : "Add with Coupon"}
            </Button>

            <Button variant="outline" onClick={startPayment} className="w-full" disabled={loading}>
              Buy with Card
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
