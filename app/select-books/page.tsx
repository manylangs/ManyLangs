
"use client";

import { LANGUAGES } from "@/app/config/languages";
import { useEffect, useState, useMemo } from "react";
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

  paymentIntentId?: string | null;
  disabled?: boolean;
  couponCount?: number | null; // 🔥 추가

  usedLang?: string | null;
  usedSeries?: string | null;
  usedLevel?: string | null;
};
type Amount = "3" | "5" | "20" | "50" | "100";

/* ================= constants ================= */

// const LANGUAGES = [
//   { code: "kr", label: "Korean" },
//   { code: "en", label: "English" },
//   { code: "es", label: "Spanish" },
//   { code: "fr", label: "French" },
//   { code: "pt", label: "Portuguese" },
// ];import { LANGUAGES } from "@/app/config/languages"; 여기에서 단일

const SERIES_CONFIG: Record<string, { label: string; hasLevel: boolean }> = {
  grammar: { label: "Grammar", hasLevel: true },
  conversation: { label: "Conversation", hasLevel: true },
  real: { label: "Real", hasLevel: true },
  voca: { label: "Vocabulary", hasLevel: true },
  idiom: { label: "Idiom", hasLevel: false },       // ✅ 단권
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const COUPON_PAGE_SIZE = 10;



/* ================= utils ================= */
async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function getCouponStatus(c: CouponItem, currentUserId: string) {
  if (c.used) {
    if (c.usedBy && c.usedBy !== currentUserId) {
      return { text: "Used by another user", color: "#999" };
    }
    return { text: "Used", color: "#999" };
  }
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

  const [isAndroid, setIsAndroid] = useState(false);
  const [mounted, setMounted] = useState(false);
  const PAYMENT_OPTIONS = !mounted ? [] : (isAndroid
    ? [
        { amount: "3" as Amount, label: "$3", coupons: 2, desc: "2 coupons" },
        { amount: "5" as Amount, label: "$5", coupons: 4, desc: "4 coupons" },
      ]
    : [
        { amount: "3" as Amount, label: "$3", coupons: 2, desc: "2 coupons" },
        { amount: "5" as Amount, label: "$5", coupons: 4, desc: "4 coupons" },
        { amount: "20" as Amount, label: "$20", coupons: 20, desc: "20 coupons" },
        { amount: "50" as Amount, label: "$50", coupons: 60, desc: "60 coupons" },
        { amount: "100" as Amount, label: "$100", coupons: 150, desc: "150 coupons" },
      ]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [couponBox, setCouponBox] = useState<CouponItem[]>([]);
  const [couponPage, setCouponPage] = useState(1);
  const [libraryPage, setLibraryPage] = useState(1);
  const [targetLang, setTargetLang] = useState(() => {
    if (typeof window === "undefined") return "kr";
    return localStorage.getItem("ml_target_lang") || "kr";
  });
  const [book, setBook] = useState("");
  const [level, setLevel] = useState("");
  const [coupon, setCoupon] = useState("");

  const [payAmount, setPayAmount] = useState<Amount>("5"); // ✅ 결제 금액 선택

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refundPreviewGroups, setRefundPreviewGroups] = useState<any[]>([]);
  useEffect(() => {
    setIsAndroid(!!(window as any).AndroidBridge);
    setMounted(true);
  }, []);

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
  // 🔥 refund UI 동기화용 상태
  const [refundViewCoupons, setRefundViewCoupons] = useState<CouponItem[]>([]);
  const [refundViewLicenses, setRefundViewLicenses] = useState<LibraryItem[]>([]);
  // 🔥 START - refund preview state
  const [refundPreviewOpen, setRefundPreviewOpen] = useState(false);
  // 🔥 END

  // 🔥 서버 기준 최신 데이터 가져오기
  useEffect(() => {
    if (!isLoaded || !userId) return;

    (async () => {
      try {
        const [couponRes, licenseRes] = await Promise.all([
          fetch("/api/coupons/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          }),
          fetch("/api/licenses/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          }),
        ]);

        const couponData = await safeJson(couponRes);
        const licenseData = await safeJson(licenseRes);

        setRefundViewCoupons(
          Array.isArray(couponData?.coupons) ? couponData.coupons : []
        );
        setRefundViewLicenses(
          Array.isArray(licenseData?.licenses) ? licenseData.licenses : []
        );
      } catch {
        // ignore
      }
    })();
  }, [isLoaded, userId]);
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

    const finalLevel =
      SERIES_CONFIG[book].hasLevel ? level : "all";

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
        const map = new Map<string, CouponItem>();

        // ✅ 서버 기준으로 먼저 세팅 (핵심)
        for (const c of couponBox) {
          map.set(c.code, c);
        }

        const k = lic.code ?? coupon.trim();

        map.set(k, {
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
    setLoading(true);
    setError("");

    try {
      // ✅ Android WebView 감지 → IAP 브릿지 호출 (Stripe 안 탐)
      if (typeof window !== "undefined" && (window as any).AndroidBridge) {
        (window as any).AndroidBridge.purchase(payAmount);
        setLoading(false);
        return;
      }

      // ✅ 일반 브라우저 → 기존 Stripe 그대로
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: payAmount,
        }),
      });

      const data = await safeJson(res);

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
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Android IAP 결제 완료 콜백 (앱에서 호출됨)
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).onIAPSuccess = async (purchaseToken: string, amount: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/iap/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseToken, amount }),
        });
        const data = await safeJson(res);
        if (!res.ok) {
          setError(data?.error || "IAP verification failed.");
          return;
        }
        // ✅ 쿠폰 목록 서버에서 새로고침
        const couponRes = await fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const couponData = await safeJson(couponRes);
        if (couponRes.ok && Array.isArray(couponData?.coupons)) {
          setCouponBox(couponData.coupons);
        }
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    };

    return () => {
      delete (window as any).onIAPSuccess;
    };
  }, [userId]);

  async function requestRefund() {
    if (!confirm("Refund all eligible purchases?")) return;
    if (loading) return;

    setLoading(true);

    try {
      // 1) 환불 직전 최신 상태 조회
      const [beforeCouponRes, beforeLicenseRes] = await Promise.all([
        fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
        fetch("/api/licenses/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
      ]);

      const beforeCouponData = await safeJson(beforeCouponRes);
      const beforeLicenseData = await safeJson(beforeLicenseRes);

      const beforeCoupons: CouponItem[] = Array.isArray(beforeCouponData?.coupons)
        ? beforeCouponData.coupons
        : [];
      const beforeLicenses: LibraryItem[] = Array.isArray(beforeLicenseData?.licenses)
        ? beforeLicenseData.licenses
        : [];

      // 2) 최신 기준으로 환불 가능 여부 먼저 판정
      const beforeRefundableGroups = getRefundableGroups(beforeCoupons, beforeLicenses);

      // UI도 최신화
      setCouponBox(beforeCoupons);
      writeLocalCoupons(beforeCoupons);
      setLibrary(beforeLicenses);
      setRefundViewCoupons(beforeCoupons);
      setRefundViewLicenses(beforeLicenses);

      if (beforeRefundableGroups.length === 0) {
        alert("Refund unavailable (coupon already used)");
        return;
      }

      // 3) 환불 실행
      const refundRes = await fetch("/api/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const refundData = await safeJson(refundRes);

      if (!refundRes.ok) {
        alert(refundData?.error || "Refund failed");
        setRefundPreviewOpen(false);
        return;
      }

      // 4) 환불 후 최신 상태 재조회 (핵심)
      const [afterCouponRes, afterLicenseRes] = await Promise.all([
        fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
        fetch("/api/licenses/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
      ]);

      const afterCouponData = await safeJson(afterCouponRes);
      const afterLicenseData = await safeJson(afterLicenseRes);

      const afterCoupons: CouponItem[] = Array.isArray(afterCouponData?.coupons)
        ? afterCouponData.coupons
        : [];
      const afterLicenses: LibraryItem[] = Array.isArray(afterLicenseData?.licenses)
        ? afterLicenseData.licenses
        : [];

      // 5) 최신 상태를 모든 UI 기준 state에 동시 반영
      setCouponBox(afterCoupons);
      writeLocalCoupons(afterCoupons);
      setLibrary(afterLicenses);
      setRefundViewCoupons(afterCoupons);
      setRefundViewLicenses(afterLicenses);


      alert("Refund completed");
      setRefundPreviewOpen(false);
      setRefundPreviewGroups([]);
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  // START - server based preview check
  async function handleRefundCheck() {
    if (loading || refundPreviewOpen) return;

    setLoading(true);

    try {
      const [couponRes, licenseRes] = await Promise.all([
        fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
        fetch("/api/licenses/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
      ]);

      const couponData = await safeJson(couponRes);
      const licenseData = await safeJson(licenseRes);

      const coupons = Array.isArray(couponData?.coupons)
        ? couponData.coupons
        : [];

      const licenses = Array.isArray(licenseData?.licenses)
        ? licenseData.licenses
        : [];
      const groups = getRefundableGroups(coupons, licenses);

      // 🔥 여기서 바로 차단
      if (groups.length === 0) {
        alert("Refund unavailable (already used or already refunded)");
        return;
      }

      const strictGroups = groups.filter((group: any) => {
        return !group.some((c: any) => {
          if (c.used === true) return true;
          if (c.usedBy && c.usedBy !== userId) return true;
          return false;
        });
      });
      if (strictGroups.length === 0) {
        alert("Refund unavailable (already used or already refunded)");
        return;
      }
      // 🔥 END - strict refund validation

      // UI 최신화
      setCouponBox(coupons);
      setLibrary(licenses);
      setRefundViewCoupons(coupons);
      setRefundViewLicenses(licenses);

      // 🔥 START - strict 기준으로만 판단
      if (strictGroups.length === 0) {
        alert("Refund unavailable (already used or already refunded)");
        return;
      }
      setRefundPreviewGroups(strictGroups);

      // ✅ 여기서만 preview 열림
      setRefundPreviewOpen(true);

    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  function openBook(item: LibraryItem) {
    if (isExpired(item.expiresAt)) {
      setError("Expired textbook. Please redeem a new coupon or purchase again.");
      return;
    }

    let levelPath = `/${item.level}`;

    if (item.level === "all") {
      if (item.series === "idiom") {
        levelPath = "/a1";
      } else {
        levelPath = "";
      }
    }

    router.push(`/viewer/${item.lang}/${item.series}${levelPath}/001`);
  }

  const filteredLibrary = library.filter((i) => i.lang === targetLang && !isExpired(i.expiresAt));
  const LIBRARY_PAGE_SIZE = 5;

  const sortedLibrary = [...filteredLibrary].sort(
    (a, b) => b.expiresAt - a.expiresAt
  );

  const libraryTotal = sortedLibrary.length;

  const libraryTotalPages = Math.max(
    1,
    Math.ceil(libraryTotal / LIBRARY_PAGE_SIZE)
  );

  const safeLibraryPage = Math.min(
    Math.max(1, libraryPage),
    libraryTotalPages
  );

  const libraryStart = (safeLibraryPage - 1) * LIBRARY_PAGE_SIZE;

  const pageLibrary = sortedLibrary.slice(
    libraryStart,
    libraryStart + LIBRARY_PAGE_SIZE
  );
  // ✅ Coupon UX: sort (unused first) + pagination (10/page)
  const sortedCoupons = [
    ...couponBox.filter((c) => !c.used),
    ...couponBox.filter((c) => c.used)
  ];

  // refund는 "paymentIntent 묶음" 기준으로 계산

  function getRefundableGroups(coupons: CouponItem[], library: LibraryItem[]) {
    const usedCouponCodes = new Set(
      library
        .filter((l) => l.source === "coupon" && l.code)
        .map((l) => l.code as string)
    );

    const groups: Record<string, CouponItem[]> = {};

    for (const c of coupons) {
      if (!c.paymentIntentId) continue;

      if (!groups[c.paymentIntentId]) {
        groups[c.paymentIntentId] = [];
      }

      groups[c.paymentIntentId].push(c);
    }

    const refundable: CouponItem[][] = [];
    for (const group of Object.values(groups)) {

      const originalCount =
        typeof group[0]?.couponCount === "number" && group[0].couponCount > 0
          ? group[0].couponCount
          : group.length;

      const currentCount = group.length;

      const anyUsed =
        currentCount < originalCount ||

        group.some((c) => {
          if (c.used === true && c.usedBy === userId) return true;
          if (c.used === true && c.usedBy && c.usedBy !== userId) return true;
          if (usedCouponCodes.has(c.code)) return true; // 🔥 이거 추가
          return false;
        });

      if (!anyUsed) {
        refundable.push(group);
      }
    }

    return refundable;
  }




  const refundBaseCoupons =
    refundViewCoupons.length > 0 ? refundViewCoupons : couponBox;

  const refundBaseLicenses =
    refundViewLicenses.length > 0 ? refundViewLicenses : library;

  const refundableGroups = getRefundableGroups(refundBaseCoupons, refundBaseLicenses);

  const refundablePurchaseCount = refundableGroups.length;
  const refundableCouponCount = refundableGroups.flat().length;

  const canRefund = refundablePurchaseCount > 0;

  const couponTotal = sortedCoupons.length;
  const couponTotalPages = Math.max(1, Math.ceil(couponTotal / COUPON_PAGE_SIZE));

  const safeCouponPage = Math.min(Math.max(1, couponPage), couponTotalPages);
  const couponStart = (safeCouponPage - 1) * COUPON_PAGE_SIZE;
  const pageCoupons = sortedCoupons.slice(couponStart, couponStart + COUPON_PAGE_SIZE);

  return (
    <main className="px-4 py-8">
      <main className="px-4 py-8">
        {/* 🔥 START - header with admin */}
        {isUserLoaded && isSignedIn && (
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">

            {/* LEFT */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/app")}
                className="h-8 shrink-0"
              >
                Home
              </Button>

              {/* 🔥 Admin 버튼 */}
              {user?.primaryEmailAddress?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin")}
                  className="h-8 shrink-0 border-red-500 text-red-500"
                >
                  Admin
                </Button>
              )}

              {/* 🔥 Revenue 버튼 */}
              {user?.primaryEmailAddress?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/revenue")}
                  className="h-8 shrink-0 border-red-500 text-red-500"
                >
                  Revenue
                </Button>
              )}

              {/* 🔥 Logs 버튼 */}
              {user?.primaryEmailAddress?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/logs")}
                  className="h-8 shrink-0 border-red-500 text-red-500"
                >
                  Logs
                </Button>
              )}
            </div>

            {/* RIGHT */}
            <div className="text-xs text-gray-500 whitespace-nowrap text-right">
              Contact:{" "}
              <a className="underline font-medium" href="mailto:manylangs.help@gmail.com">
                ✉ manylangs.help@gmail.com
              </a>
            </div>

          </div>
        )}
      </main>


      {/* ✅ 반응형 레이아웃 wrapper (여기만 변경) */}
      <div className="mx-auto w-full max-w-5xl pt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* My Library */}
            <Card>
              <CardHeader>
                <CardTitle>My Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {libraryTotal > 0 && (
                  <div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <div>
                      Total: <b>{libraryTotal}</b>
                    </div>

                    <div className="flex items-center gap-2">

                      <button
                        type="button"
                        className="rounded border px-2 py-1 disabled:opacity-50"
                        onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
                        disabled={safeLibraryPage === 1}
                      >
                        {"<"}
                      </button>

                      <span className="text-xs text-gray-600">
                        {safeLibraryPage} / {libraryTotalPages}
                      </span>

                      <button
                        type="button"
                        className="rounded border px-2 py-1 disabled:opacity-50"
                        onClick={() =>
                          setLibraryPage((p) => Math.min(libraryTotalPages, p + 1))
                        }
                        disabled={safeLibraryPage === libraryTotalPages}
                      >
                        {">"}
                      </button>

                    </div>
                  </div>
                )}
                {filteredLibrary.length === 0 && (
                  <p className="text-sm text-gray-500">No textbooks yet.</p>
                )}
                {pageLibrary.map((item, idx) => (
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
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <CardTitle>My Coupons</CardTitle>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      Tap/click a code to copy
                    </span>
                  </div>

                  {/* 🔥 추가 */}
                  <div className="text-xs text-red-400 text-center">
                    Status may take a moment. Please refresh if needed.
                  </div>
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
                  const status = getCouponStatus(c, userId!);
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
            <Card id="add-textbook-section">
              <CardHeader>
                <CardTitle>Add a textbook</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* ✅ Language 선택 (맨 위로 이동) */}
                <div>
                  <div className="text-sm font-semibold mb-1">
                    Language you want to learn
                  </div>
                  <select
                    value={targetLang}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTargetLang(v);
                      localStorage.setItem("ml_target_lang", v);
                    }}
                    className="block w-full rounded border px-3 py-2"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* textbook 선택 */}
                <select
                  value={book}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBook(next);
                    setLevel(SERIES_CONFIG[next]?.hasLevel ? "a1" : "");
                  }}
                  className="block w-full rounded border px-3 py-2"
                >
                  <option value="">Select textbook</option>
                  {Object.entries(SERIES_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>

                {/* level */}
                {book && SERIES_CONFIG[book].hasLevel && (
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="block w-full rounded border px-3 py-2"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l.toLowerCase()}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}

                {/* coupon input */}
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Coupon code"
                  className="block w-full rounded border px-3 py-2"
                />

                {/* 설명 */}
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    1 coupon = 30-day access
                    <br />Coupons can be shared with others.
                    <br /> However, ManyLangs cannot individually track
                    <br />whether a shared coupon has been used.
                  </p>
                </div>
                {/* plan 선택 */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Choose a plan</div>

                  <select
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value as Amount)}
                    className="block w-full rounded border px-3 py-2"
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

                {/* 버튼 */}
                <div className="space-y-2 pt-2">

                  <button
                    onClick={activateCoupon}
                    disabled={loading}
                    className="w-full rounded bg-black text-white py-2 text-sm font-medium"
                  >
                    {loading
                      ? "Processing..."
                      : `Add ${LANGUAGES.find(l => l.code === targetLang)?.label} textbook`}
                  </button>

                  <button
                    onClick={startPayment}
                    disabled={loading}
                    className="w-full rounded bg-black text-white py-2 text-sm font-medium"
                  >
                    Buy coupons using your card
                  </button>

                </div>

              </CardContent>
            </Card>
            {/* Refund */}
            <Card>

              <CardHeader className="text-center">
                <CardTitle>Refund</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">



                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading || refundPreviewOpen || !canRefund}
                  onClick={handleRefundCheck}
                >
                  Refund Eligible Purchases
                </Button>

                {refundPreviewOpen && canRefund && (
                  <div className="border rounded p-3 text-center space-y-2 bg-gray-50">

                    <div className="text-sm font-semibold">
                      Refund available
                    </div>

                    <div className="text-xs text-gray-600">
                      {refundablePurchaseCount} purchase
                      {refundablePurchaseCount > 1 ? "s" : ""} ({refundableCouponCount} coupons)
                    </div>

                    <div className="text-xs text-gray-500">
                      Do you want to proceed with the refund?
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="w-full"
                        onClick={requestRefund}
                      >
                        Confirm Refund
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setRefundPreviewOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                  </div>
                )}
                {!canRefund && (
                  <div className="text-xs text-gray-400 text-center">
                    Refund unavailable (already used or already refunded)
                  </div>
                )}
                <div className="text-xs text-gray-500 space-y-1 text-left">
                  <div className="text-center font-extrabold text-red-500">
                    Refund Policy
                  </div>
                  <div>• Refund not available if any coupon from the same purchase has been used</div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}





