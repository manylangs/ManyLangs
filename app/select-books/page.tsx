// app/select-books/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import {
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

const COUPON_PAGE_SIZE = 10;

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
async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
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

/** ✅ expiredUsedCodes → 만료로 정리된(=aliveLib에 없는) "내 사용 쿠폰" 코드 집합 */
function buildExpiredUsedCouponCodeSet(
  localCoupons: CouponItem[],
  aliveLib: LibraryItem[],
  currentUserId: string
) {
  const aliveCodes = buildAliveCouponCodeSet(aliveLib);
  const expired = new Set<string>();

  for (const c of localCoupons) {
    if (!c?.code) continue;
    if (!c.used) continue;

    // ✅ "내가 사용한 쿠폰"만 만료 정리 대상
    // (A가 발행했고 B가 사용한 shared coupon은 A 화면에서 제거 대상이 아님)
    if (c.usedBy !== currentUserId) continue;

    // ✅ 내가 교재로 사용한 쿠폰만(메타 있는 케이스)
    if (!c.usedSeries) continue;

    if (!aliveCodes.has(c.code)) expired.add(c.code);
  }

  return expired;
}

/* ================= page ================= */

export default function SelectBooksPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isSignedIn, isLoaded: isUserLoaded } = useUser();

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [couponBox, setCouponBox] = useState<CouponItem[]>([]);
  const [couponPage, setCouponPage] = useState(1);

  const [targetLang, setTargetLang] = useState("kr");
  const [book, setBook] = useState("");
  const [level, setLevel] = useState("");
  const [coupon, setCoupon] = useState("");

  const [payAmount, setPayAmount] = useState<Amount>("5"); // ✅ 결제 금액 선택

  const [error, setError] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);


  /** ✅ (NEW) 계정 변경/로그아웃 시 localStorage 캐시 초기화 */
  useEffect(() => {
    if (!isLoaded) return;

    const key = "ml_uid";
    const prev = localStorage.getItem(key);

    // 로그아웃
    if (!userId) {
      localStorage.removeItem("library");
      localStorage.removeItem("couponBox");
      localStorage.removeItem(key);
      return;
    }

    // 계정 변경
    if (prev && prev !== userId) {
      localStorage.removeItem("library");
      localStorage.removeItem("couponBox");
    }

    localStorage.setItem(key, userId);
  }, [isLoaded, userId]);

  /** 1) 초기 로드 + checkout success 처리 + 서버 coupon sync */
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace("/login");
      return;
    }

    (async () => {
      // ✅ (A) Firestore 기준 라이브러리 로드 + aliveLib 확보
      let aliveLib: LibraryItem[] = [];
      try {
        const res = await fetch("/api/licenses/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        let data: any = {};
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        aliveLib = Array.isArray(data.licenses) ? (data.licenses as LibraryItem[]) : [];
      } catch {
        aliveLib = [];
      }
      setLibrary(aliveLib);

      // ✅ (B) 쿠폰박스 로드 (UI는 서버 sync 결과만 사용)
      const localCoupons = readLocalCoupons();
      const aliveCodes = buildAliveCouponCodeSet(aliveLib);
      const cleanedCoupons = localCoupons.filter((c) => {
        // 미사용 쿠폰은 항상 유지
        if (!c.used) return true;

        // ✅ 남이 사용한(shared) 쿠폰은 A 화면에서 지우지 않음
        if (c.usedBy && c.usedBy !== userId) return true;

        // ✅ 내가 사용한 쿠폰만 라이선스(aliveLib) 없으면 만료로 정리
        return aliveCodes.has(c.code);
      });
      writeLocalCoupons(cleanedCoupons);

      // ✅ (C) 결제 성공 처리: /select-books?checkout=success&session_id=...
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const sessionId = params.get("session_id");

      if (checkout === "success" && sessionId) {
        try {
          setRedeemLoading(true);
          setError("");

          const res = await fetch("/api/checkout/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });

          const data = (await safeJson(res)) ?? {};

          if (!res.ok) {
            setError((data as any).error || "Checkout complete failed.");
          } else {
            const newCodes: string[] = Array.isArray((data as any).coupons)
              ? (data as any).coupons
              : [];

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
          }
        } catch {
          setError("Network error.");
        } finally {
          setRedeemLoading(false);
          // ✅ string 고정 (SyntaxError 방지)
          window.history.replaceState({}, "", "/select-books");
        }
      }

      // ✅ (D) 서버 쿠폰 동기화 (webhook 발급 포함)
      try {
        const res = await fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await safeJson(res);

        if (!res.ok) return;

        const serverCoupons: CouponItem[] = Array.isArray((data as any)?.coupons)
          ? ((data as any).coupons as CouponItem[])
          : [];

        // ✅ 여기서도 만료기준은 “이미 위에서 확정한 aliveLib” 사용
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

          // ✅ 핵심: localNow 말고 "mergedServer" 기준으로 만료 제거 대상 계산
          const expiredUsedCodes2 = buildExpiredUsedCouponCodeSet(mergedServer, aliveLib, userId);

          const finalList = mergedServer.filter(
            (c) => !(c.used && expiredUsedCodes2.has(c.code))
          );

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

    // ✅ used 쿠폰이 하나도 없으면 폴링 필요 없음
    const hasUsed = couponBox.some((c) => c.used);
    if (!hasUsed) return;

    const tick = async () => {
      try {
        const res = await fetch("/api/licenses/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const data = (await safeJson(res)) ?? {};
        const aliveLib: LibraryItem[] = Array.isArray((data as any).licenses)
          ? ((data as any).licenses as LibraryItem[])
          : [];

        setLibrary(aliveLib);

        const localNow = readLocalCoupons();
        const expiredUsedCodes = buildExpiredUsedCouponCodeSet(localNow, aliveLib, userId);

        if (expiredUsedCodes.size === 0) return;

        const nextCoupons = localNow.filter((c) => !(c.used && expiredUsedCodes.has(c.code)));
        setCouponBox(nextCoupons);
        writeLocalCoupons(nextCoupons);
      } catch {
        // ignore
      }
    };

    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [isLoaded, userId]);
  // ✅ couponBox 추가
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

  useEffect(() => {
    setCouponPage(1);
  }, [couponBox.length]);

  // ✅ Hook 끝난 뒤에만 early return
  if (!isLoaded) return null;
  if (!userId) return null;

  async function activateCoupon() {
    if (redeemLoading) return;
    setError("");
    setRedeemLoading(true);

    if (!coupon.trim() || !book || (SERIES_CONFIG[book].hasLevel && !level)) {
      setError("Please complete all fields.");
      setRedeemLoading(false);
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

      const data = await safeJson(res);

      if (!res.ok) {
        setError((data as any)?.error || "Invalid coupon.");
        return;
      }

      const lic = (data as any).license as LibraryItem | undefined;
      const cp = (data as any).coupon as CouponItem | undefined;

      if (!lic || !lic.expiresAt) {
        setError("Redeem succeeded, but license missing.");
        return;
      }

      const nextLib = upsertLicense(lic, userId).filter((x) => !isExpired(x.expiresAt)); // ✅ expired 즉시 제거
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
      setRedeemLoading(false);
    }
  }

  // ✅ 여기만 변경: startPayment에 try/catch + json safe + 로딩가드
  async function startPayment() {
    if (redeemLoading) return;
    setError("");
    setRedeemLoading(true);

    if (!isLoaded || !userId) {
      setError("Please login first.");
      setRedeemLoading(false);
      return;
    }

    if (!book || (SERIES_CONFIG[book].hasLevel && !level)) {
      setError("Please select textbook and level.");
      setRedeemLoading(false);
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

      const data = (await safeJson(res)) ?? {};

      if (!res.ok) {
        setError((data as any).error || "Checkout failed.");
        return;
      }

      if ((data as any)?.url) {
        window.location.href = (data as any).url;
      } else {
        setError("Checkout URL missing.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRedeemLoading(false);
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

  const filteredLibrary = library.filter((i) => i.lang === targetLang && !isExpired(i.expiresAt));

  // ✅ Coupon UX: sort (unused first) + pagination (10/page)
  const sortedCoupons = [...couponBox.filter((c) => !c.used), ...couponBox.filter((c) => c.used)];

  const couponTotal = sortedCoupons.length;
  const couponTotalPages = Math.max(1, Math.ceil(couponTotal / COUPON_PAGE_SIZE));

  const safeCouponPage = Math.min(Math.max(1, couponPage), couponTotalPages);
  const couponStart = (safeCouponPage - 1) * COUPON_PAGE_SIZE;
  const pageCoupons = sortedCoupons.slice(couponStart, couponStart + COUPON_PAGE_SIZE);

  return (
    <main className="px-4 py-8">
      {isUserLoaded && isSignedIn && (
        <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-2">
            <div className="flex items-center gap-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
                className="h-8"
              >
                Home
              </Button>

              <div className="text-xs text-gray-500">
                General inquiries:&nbsp;
                <a className="underline" href="mailto:manylangs.help@gmail.com">
                  manylangs.help@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 반응형 레이아웃 wrapper (여기만 변경) */}
      <div className="mx-auto w-full max-w-5xl pt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
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
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <div className="text-sm">
                      {item.series.toUpperCase()}
                      {item.level !== "all" && ` · ${item.level.toUpperCase()}`}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        style={{
                          fontSize: 12,
                          color:
                            remainingText(item.expiresAt) === "Expired" ? "#d00" : "#555",
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
                <div className="flex items-center justify-between">
                  <CardTitle>My Coupons</CardTitle>
                  <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                    Tap/click a code to copy
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {couponTotal === 0 && (
                  <p className="text-sm text-gray-500">No coupons available.</p>
                )}

                {/* Header: total + pagination */}
                {couponTotal > 0 && (
                  <div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <div>
                      Total: <b>{couponTotal}</b>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 disabled:opacity-50"
                        onClick={() => setCouponPage((p) => Math.max(1, p - 1))}
                        disabled={safeCouponPage === 1}
                        aria-label="Previous page"
                      >
                        {"<"}
                      </button>

                      <span className="text-xs text-gray-600">
                        {safeCouponPage} / {couponTotalPages}
                      </span>

                      <button
                        type="button"
                        className="rounded border px-2 py-1 disabled:opacity-50"
                        onClick={() =>
                          setCouponPage((p) => Math.min(couponTotalPages, p + 1))
                        }
                        disabled={safeCouponPage === couponTotalPages}
                        aria-label="Next page"
                      >
                        {">"}
                      </button>
                    </div>
                  </div>
                )}

                {/* List: paged coupons */}
                {pageCoupons.map((c, idx) => {
                  const status = getCouponStatus(c);
                  const usedAt = c.used ? formatUsedAt(c.usedAt) : "";
                  const usedBook = formatUsedBook(c);

                  return (
                    <div
                      key={`${c.code}-${idx}`}
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
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
                  Coupons can be shared with others. However, ManyLangs cannot individually
                  track whether a shared coupon has been used.
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

                  <div className="space-y-1 text-xs text-gray-500">
                    {PAYMENT_OPTIONS.map((p) => (
                      <div key={p.amount}>
                        {p.label} → {p.coupons} coupons
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button onClick={activateCoupon} disabled={redeemLoading} className="w-full">
                  {redeemLoading ? "Processing..." : "Add with Coupon"}
                </Button>

                <Button
                  variant="outline"
                  onClick={startPayment}
                  className="w-full"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Redirecting..." : "Buy with Card"}
                </Button>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
