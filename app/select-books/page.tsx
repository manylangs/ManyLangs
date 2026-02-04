// app/select-books/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import {
  cleanExpiredLibrary,
  isExpired,
  remainingText,
  upsertLicense,
  type License,
} from "@/lib/license";

/* ================= types ================= */

type LibraryItem = License;

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

type Amount = "3" | "5" | "20" | "50" | "100";

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

const PAYMENT_OPTIONS: Array<{
  amount: Amount;
  label: string;
  coupons: number;
  desc: string;
}> = [
  { amount: "3", label: "$3", coupons: 2, desc: "2 coupons" },
  { amount: "5", label: "$5", coupons: 4, desc: "4 coupons" },
  { amount: "20", label: "$20", coupons: 20, desc: "20 coupons" },
  { amount: "50", label: "$50", coupons: 60, desc: "60 coupons" },
  { amount: "100", label: "$100", coupons: 150, desc: "150 coupons" },
];

/* ================= utils ================= */

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

function readLocalCoupons(): CouponItem[] {
  try {
    const arr = JSON.parse(localStorage.getItem("couponBox") || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeLocalCoupons(list: CouponItem[]) {
  localStorage.setItem("couponBox", JSON.stringify(list));
}

/** ✅ aliveLib → 살아있는 coupon code 집합 */
function buildAliveCouponCodeSet(aliveLib: LibraryItem[]) {
  return new Set(
    aliveLib.filter((x) => x.source === "coupon" && x.code).map((x) => x.code as string)
  );
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

  const [payAmount, setPayAmount] = useState<Amount>("5"); // ✅ 결제 금액 선택

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** 1) 초기 로드 + checkout success 처리 + 서버 coupon sync */
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace("/login");
      return;
    }

    // ✅ (A) 라이브러리 만료 청소 + state 반영 (여기서 aliveLib “1번만” 결정)
    const aliveLib = cleanExpiredLibrary();
    setLibrary(aliveLib);

    // ✅ (B) 쿠폰박스 로드 + used 쿠폰은 "유효 license(code)" 있을 때만 유지
    const localCoupons = readLocalCoupons();
    const aliveCodes = buildAliveCouponCodeSet(aliveLib);
    const cleanedCoupons = localCoupons.filter((c) => !c.used || aliveCodes.has(c.code));
    setCouponBox(cleanedCoupons);
    writeLocalCoupons(cleanedCoupons);

    // ✅ (C) 결제 성공 처리: /select-books?checkout=success&session_id=...
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

          const newCodes: string[] = Array.isArray(data.coupons) ? data.coupons : [];
          if (newCodes.length > 0) {
            setCouponBox((prev) => {
              const map = new Map(prev.map((c) => [c.code, c]));
              for (const code of newCodes) {
                if (!map.has(code)) map.set(code, { code, used: false });
              }
              const next = Array.from(map.values());
              writeLocalCoupons(next);
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

    // ✅ (D) 서버 쿠폰 동기화 (webhook 발급 포함)
    (async () => {
      try {
        const res = await fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (!res.ok) return;

        const serverCoupons: CouponItem[] = Array.isArray(data.coupons) ? data.coupons : [];

        // ✅ 여기서도 만료기준은 “이미 위에서 확정한 aliveLib” 사용
        const aliveCodes2 = buildAliveCouponCodeSet(aliveLib);

        // ✅ "서버가 단일 진실" → serverCoupons 기준으로 덮어쓰기
        setCouponBox((prev) => {
          const prevMap = new Map(prev.map((c) => [c.code, c]));

          const mergedServer = serverCoupons.map((sc) => {
            const prevOne = prevMap.get(sc.code);
            return {
              ...(prevOne ?? {}),
              ...sc,
              usedLang: sc.usedLang ?? prevOne?.usedLang ?? null,
              usedSeries: sc.usedSeries ?? prevOne?.usedSeries ?? null,
              usedLevel: sc.usedLevel ?? prevOne?.usedLevel ?? null,
            } as CouponItem;
          });

          // ✅ used 쿠폰은 유효 license(code) 있을 때만 유지
          const finalList = mergedServer.filter((c) => !c.used || aliveCodes2.has(c.code));

          writeLocalCoupons(finalList);
          return finalList;
        });
      } catch {
        // ignore
      }
    })();
  }, [isLoaded, userId, router]);

  /** 2) ⏱ 자동 제거 타이머 */
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const tick = () => {
      // (1) 만료 라이선스 제거
      const aliveLib = cleanExpiredLibrary();
      setLibrary(aliveLib);

      // (2) used 쿠폰도 같이 제거 (해당 coupon code의 license가 살아있을 때만 유지)
      const aliveCodes = buildAliveCouponCodeSet(aliveLib);

      const coupons = readLocalCoupons();
      const nextCoupons = coupons.filter((c) => !c.used || aliveCodes.has(c.code));

      setCouponBox(nextCoupons);
      writeLocalCoupons(nextCoupons);
    };

    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [isLoaded, userId]);

  /** 3) 라이선스 기반 usedBook 필드 보강 */
  useEffect(() => {
    if (!isLoaded || !userId) return;
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

      writeLocalCoupons(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, library]);

  // ✅ Hook 끝난 뒤에만 early return
  if (!isLoaded) return null;
  if (!userId) return null;

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

      const nextLib = upsertLicense(lic);
      setLibrary(nextLib);

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

        const next = Array.from(map.values());
        writeLocalCoupons(next);
        return next;
      });

      setCoupon("");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 여기만 변경: startPayment에 try/catch + json safe + 로딩가드
  async function startPayment() {
    if (loading) return;
    setError("");
    setLoading(true);

    if (!isLoaded || !userId) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    if (!book || (SERIES_CONFIG[book].hasLevel && !level)) {
      setError("Please select textbook and level.");
      setLoading(false);
      return;
    }

    const finalLevel = SERIES_CONFIG[book].hasLevel ? level : "all";

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lang: targetLang,
          series: book,
          level: finalLevel,
          amount: payAmount, // ✅ 선택한 금액
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data?.error || "Checkout failed.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Checkout URL missing.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function openBook(item: LibraryItem) {
    if (isExpired(item.expiresAt)) {
      setError("Expired textbook. Please redeem a new coupon or purchase again.");
      return;
    }

    const levelPath = item.level === "all" ? "" : `/${item.level}`;
    router.push(`/viewer/${item.lang}/${item.series}${levelPath}/001`);
  }

  const filteredLibrary = library.filter((i) => i.lang === targetLang);

  return (
    <main className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle>Language you want to learn</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
            {filteredLibrary.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded border px-3 py-2">
                <div className="text-sm">
                  {item.series.toUpperCase()}
                  {item.level !== "all" && ` · ${item.level.toUpperCase()}`}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      fontSize: 12,
                      color: remainingText(item.expiresAt) === "Expired" ? "#d00" : "#555",
                    }}
                  >
                    {remainingText(item.expiresAt)}
                  </span>
                  <Button size="sm" onClick={() => openBook(item)}>
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* My Coupons */}
        <Card>
          <CardHeader>
            <CardTitle>My Coupons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {couponBox.length === 0 && <p className="text-sm text-gray-500">No coupons available.</p>}

            {couponBox.map((c, idx) => {
              const status = getCouponStatus(c);
              const usedAt = c.used ? formatUsedAt(c.usedAt) : "";
              const usedBook = formatUsedBook(c);

              return (
                <div key={idx} className="flex justify-between rounded border px-3 py-2 text-sm">
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
              Coupons can be shared with others. However, ManyLangs cannot individually track whether
              a shared coupon has been used.
            </p>

            {/* ✅ 결제 금액 선택 + 쿠폰 수 설명 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Choose a plan</div>
              <select
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value as Amount)}
                className="block w-full rounded border px-2 py-1"
              >
                {PAYMENT_OPTIONS.map((p) => (
                  <option key={p.amount} value={p.amount}>
                    {p.label} — {p.desc}
                  </option>
                ))}
              </select>

              <div className="text-xs text-gray-500 space-y-1">
                {PAYMENT_OPTIONS.map((p) => (
                  <div key={p.amount}>
                    {p.label} → {p.coupons} coupons
                  </div>
                ))}
              </div>
            </div>

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
