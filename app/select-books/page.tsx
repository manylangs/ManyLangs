"use client";

import { LANGUAGES } from "@/app/config/languages";
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

  paymentIntentId?: string | null;
  disabled?: boolean;
  couponCount?: number | null;

  usedLang?: string | null;
  usedSeries?: string | null;
  usedLevel?: string | null;

  // 🔥 추가
  source?: string | null;
  purchaseToken?: string | null;
  transactionId?: string | null;
};
type Amount = "3" | "5" | "20" | "50" | "100";

/* ================= constants ================= */

const SERIES_CONFIG: Record<string, { label: string; hasLevel: boolean }> = {
  grammar: { label: "Grammar", hasLevel: true },
  conversation: { label: "Conversation", hasLevel: true },
  real: { label: "Real", hasLevel: true },
  voca: { label: "Vocabulary", hasLevel: true },
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

function buildAliveCouponCodeSet(aliveLib: LibraryItem[]) {
  return new Set(
    aliveLib
      .filter(
        (x) =>
          (x.source === "coupon" ||
            x.source === "promo_campaign") &&
          x.code
      )
      .map((x) => x.code as string)
  );
}

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
    if (c.usedBy !== currentUserId) continue;
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
  const [libraryPage, setLibraryPage] = useState(1);
  const [targetLang, setTargetLang] = useState(() => {
    if (typeof window === "undefined") return "kr";
    return localStorage.getItem("ml_target_lang") || "kr";
  });
  const [book, setBook] = useState("");
  const [level, setLevel] = useState("");
  const [coupon, setCoupon] = useState("");

  const [payAmount, setPayAmount] = useState<Amount>("5");

  const [error, setError] = useState("");
  const [refundError, setRefundError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [refundPreviewGroups, setRefundPreviewGroups] = useState<any[]>([]);

  const isIOS =
    typeof window !== "undefined" &&
    !!(window as any).webkit?.messageHandlers;

  const isAndroid =
    typeof window !== "undefined" &&
    ((window as any).AndroidBridge ||
      navigator.userAgent.includes("ManyLangsApp/Android"));

  useEffect(() => {
    if (!isLoaded) return;

    const key = "ml_uid";
    const prev = localStorage.getItem(key);

    if (!userId) {
      localStorage.removeItem("library");
      localStorage.removeItem("couponBox");
      localStorage.removeItem(key);
      return;
    }

    if (prev && prev !== userId) {
      localStorage.removeItem("library");
      localStorage.removeItem("couponBox");
    }

    localStorage.setItem(key, userId);
  }, [isLoaded, userId]);

  /**
   * Loads licenses + coupons for the given user and syncs local state.
   * Shared by the initial page-load effect and the "Restore Purchases"
   * action (which is just a manual re-trigger of the same refresh).
   */
  async function loadAccountData(uid: string | null | undefined) {
    let aliveLib: LibraryItem[] = [];
    try {
      const res = await fetch("/api/licenses/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
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

    const localCoupons = readLocalCoupons();
    const aliveCodes = buildAliveCouponCodeSet(aliveLib);
    const cleanedCoupons = localCoupons.filter((c) => {
      if (!c.used) return true;
      if (c.usedBy && c.usedBy !== uid) return true;
      return aliveCodes.has(c.code);
    });
    writeLocalCoupons(cleanedCoupons);

    try {
      const res = await fetch("/api/coupons/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await safeJson(res);

      if (!res.ok) return;

      const serverCoupons: CouponItem[] = Array.isArray((data as any)?.coupons)
        ? ((data as any).coupons as CouponItem[])
        : [];

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

        const expiredUsedCodes2 = buildExpiredUsedCouponCodeSet(mergedServer, aliveLib, uid as string);

        const finalList = mergedServer.filter(
          (c) => !(c.used && expiredUsedCodes2.has(c.code))
        );

        writeLocalCoupons(finalList);
        return finalList;
      });
    } catch {
      // ignore
    }
  }
  useEffect(() => {

    const handler = () => {
      loadAccountData(userId);
    };

    window.addEventListener(
      "manylangs-restore",
      handler
    );

    return () => {
      window.removeEventListener(
        "manylangs-restore",
        handler
      );
    };

  }, [userId]);
  useEffect(() => {
    if (!isLoaded) return;
    loadAccountData(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (library.length === 0 || couponBox.length === 0) return;

    const byCode = new Map<string, LibraryItem>();
    for (const l of library) {
      if (
        (l.source === "coupon" ||
          l.source === "promo_campaign") &&
        l.code
      ) {
        byCode.set(l.code, l);
      }
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


  const [refundPreviewOpen, setRefundPreviewOpen] = useState(false);



  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).onIAPSuccess = async (
      purchaseToken: string,
      productId: string
    ) => {
      setLoading(true);
      setError("");

      try {
        console.log("[IAP SUCCESS]", { purchaseToken, productId });

        const res = await fetch("/api/iap/google/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseToken,
            productId,
            provider: "google_play",
          }),
        });

        const data = await safeJson(res);

        if (!res.ok) {
          console.error("[IAP ERROR]", data);
          setError(data?.error || "IAP verification failed.");
          // ✅ verify 실패 시 consume 하지 않음 — 구매 유지
          return;
        }

        console.log("[IAP OK]", data);

        // ✅ verify 성공 후에만 consume
        if ((window as any).AndroidBridge?.consumePurchase) {
          console.log("[IAP] consuming purchase:", purchaseToken);
          (window as any).AndroidBridge.consumePurchase(purchaseToken);
        }

        const couponRes = await fetch("/api/coupons/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const couponData = await safeJson(couponRes);

        if (couponRes.ok && Array.isArray(couponData?.coupons)) {
          setCouponBox(couponData.coupons);
        }

        alert("Coupons added!");
      } catch (err) {
        console.error(err);
        setError("Network error.");
        // ✅ 네트워크 오류 시 consume 하지 않음
      } finally {
        setLoading(false);
      }
    };

    return () => {
      delete (window as any).onIAPSuccess;
    };
  }, [userId]);

  if (!isLoaded || !isUserLoaded) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (!isSignedIn) {
    return <div style={{ padding: 20 }}>Redirecting...</div>;
  }

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

      const nextLib = upsertLicense(lic, userId).filter((x) => !isExpired(x.expiresAt));
      setLibrary(nextLib);

      setCouponBox((prev) => {
        const map = new Map<string, CouponItem>();

        for (const c of prev) {
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

  async function startPayment() {
    if (loading) return;

    if (typeof window !== "undefined") {
      if ((window as any).AndroidBridge || navigator.userAgent.includes("ManyLangsApp/Android")) {
        const productId = payAmount === "3" ? "coupon_pack_2" : "coupon_pack_4";
        if ((window as any).AndroidBridge) {
          (window as any).AndroidBridge.requestPurchase(productId);
        }
        return;
      }

      if (
        (window as any)
          .webkit
          ?.messageHandlers
          ?.native
      ) {

        const productId =
          payAmount === "3"
            ? "coupon_pack_2"
            : "coupon_pack_4";

        console.log(
          "iOS IAP request:",
          productId
        );

        ; (window as any)
          .webkit
          .messageHandlers
          .native
          .postMessage({
            type: "PURCHASE",
            productId
          });

        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount }),
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

  async function handleRestorePurchases() {
    if (restoring) return;

    setRestoring(true);
    setError("");

    try {
      // Restoring purchases is just a manual refresh of this account's
      // licenses + coupons — purchases aren't locked to a specific
      // platform, they all attach to the signed-in account.
      await loadAccountData(userId);
      alert("Purchases and coupons have been refreshed.");
    } catch {
      setError("Network error.");
    } finally {
      setRestoring(false);
    }
  }

  async function requestRefund() {
    if (loading) return;

    setLoading(true);

    try {
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

      const beforeRefundableGroups = getRefundableGroups(beforeCoupons, beforeLicenses);

      setCouponBox(beforeCoupons);
      writeLocalCoupons(beforeCoupons);
      setLibrary(beforeLicenses);

      if (beforeRefundableGroups.length === 0) {
        setRefundPreviewOpen(false);
        return;
      }

      // 🔥 Stripe만 서버 환불 처리
      // 🔥 Stripe만 서버 환불 처리
      const stripeGroups = beforeRefundableGroups.filter((g) => g[0]?.paymentIntentId);
      const nonStripeGroups = beforeRefundableGroups.filter(
        (g) => !g[0]?.paymentIntentId
      );

      if (stripeGroups.length === 0) {
        const hasGoogle = nonStripeGroups.some((g) => g[0]?.purchaseToken);
        const hasApple = nonStripeGroups.some((g) => g[0]?.transactionId);

        let msg = "No card purchases to refund.\n";

        if (hasGoogle) {
          msg += "\nGoogle Play purchases are handled directly by Google Play.";
        }

        if (hasApple) {
          msg += "\nApp Store purchases are handled directly by Apple.";
        }

        if (!hasGoogle && !hasApple) {
          msg += "\nPurchases made through app stores must be refunded through the respective store.";
        }

        alert(msg);
        setRefundPreviewOpen(false);
        return;
      }

      // Stripe 환불
      if (stripeGroups.length > 0) {
        const refundRes = await fetch("/api/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const refundData = await safeJson(refundRes);

        if (!refundRes.ok) {
          alert(refundData?.error || "Refund failed");
          setRefundPreviewOpen(false);
          return;
        }

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

        setCouponBox(afterCoupons);
        writeLocalCoupons(afterCoupons);
        setLibrary(afterLicenses);

        alert("Refund completed");
        setRefundPreviewOpen(false);
        setRefundPreviewGroups([]);
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefundCheck() {
    if (loading || refundPreviewOpen) return;

    setLoading(true);
    setRefundError("");
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

      const coupons = Array.isArray(couponData?.coupons) ? couponData.coupons : [];
      const licenses = Array.isArray(licenseData?.licenses) ? licenseData.licenses : [];
      const groups = getRefundableGroups(coupons, licenses);

      if (groups.length === 0) {
        setCouponBox(coupons);
        setLibrary(licenses);
        setRefundPreviewGroups(groups); // 빈 배열
        setRefundPreviewOpen(true);
        return;
      }

      // 🔥 Stripe만 환불 미리보기 표시
      const stripeGroups = groups.filter(
        (g: CouponItem[]) => g[0]?.paymentIntentId
      );

      const validStripeGroups = stripeGroups.filter(
        (group: CouponItem[]) =>
          !group.some((c) => {
            if (c.used === true) return true;
            if (c.usedBy && c.usedBy !== userId) return true;
            return false;
          })
      );

      if (validStripeGroups.length === 0) {
        setCouponBox(coupons);
        setLibrary(licenses);
        setRefundPreviewGroups(groups); // 🔥 빈 배열 말고 전체 groups
        setRefundPreviewOpen(true);
        return;
      }

      setCouponBox(coupons);
      setLibrary(licenses);

      setRefundPreviewGroups(validStripeGroups);
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

  const sortedLibrary = [...filteredLibrary].sort((a, b) => b.expiresAt - a.expiresAt);

  const libraryTotal = sortedLibrary.length;
  const libraryTotalPages = Math.max(1, Math.ceil(libraryTotal / LIBRARY_PAGE_SIZE));
  const safeLibraryPage = Math.min(Math.max(1, libraryPage), libraryTotalPages);
  const libraryStart = (safeLibraryPage - 1) * LIBRARY_PAGE_SIZE;
  const pageLibrary = sortedLibrary.slice(libraryStart, libraryStart + LIBRARY_PAGE_SIZE);

  const sortedCoupons = [
    ...couponBox.filter((c) => !c.used),
    ...couponBox.filter((c) => c.used),
  ];

  // 🔥 getRefundableGroups: Stripe/Google Play 완전 분리 판정
  function getRefundableGroups(coupons: CouponItem[], library: LibraryItem[]) {
    const usedCouponCodes = new Set(
      library
        .filter((l) => l.source === "coupon" && l.code)
        .map((l) => l.code as string)
    );

    const stripeMap: Record<string, CouponItem[]> = {};
    const googleMap: Record<string, CouponItem[]> = {};
    const appleMap: Record<string, CouponItem[]> = {};
    const now = Date.now();

    for (const c of coupons) {
      if (c.paymentIntentId) {
        if ((c as any).expiresAt && (c as any).expiresAt < now) continue;
        const key = `stripe_${c.paymentIntentId}`;
        if (!stripeMap[key]) stripeMap[key] = [];
        stripeMap[key].push(c);
        continue;
      }
      if (c.purchaseToken) {
        const key = `google_${c.purchaseToken}`;
        if (!googleMap[key]) googleMap[key] = [];
        googleMap[key].push(c);
        continue;
      }
      if (c.transactionId) {
        const key = `apple_${c.transactionId}`;
        if (!appleMap[key]) appleMap[key] = [];
        appleMap[key].push(c);
      }
    }

    const refundable: CouponItem[][] = [];

    for (const group of Object.values(stripeMap)) {
      const originalCount =
        typeof group[0]?.couponCount === "number" && group[0].couponCount > 0
          ? group[0].couponCount
          : group.length;
      const anyUsed =
        group.length < originalCount ||
        group.some((c) => {
          if (c.used === true) return true;
          if (usedCouponCodes.has(c.code)) return true;
          return false;
        });
      if (!anyUsed) refundable.push(group);
    }

    for (const group of Object.values(googleMap)) {
      const anyUsed = group.some((c) => c.used === true);
      if (!anyUsed) refundable.push(group);
    }

    for (const group of Object.values(appleMap)) {
      const anyUsed = group.some((c) => c.used === true);
      if (!anyUsed) refundable.push(group);
    }

    return refundable;
  }

  const refundableGroups = getRefundableGroups(couponBox, library);
  const stripeRefundableGroups = refundableGroups.filter(g => g[0]?.paymentIntentId);
  const refundablePurchaseCount = stripeRefundableGroups.length;
  const refundableCouponCount = stripeRefundableGroups.flat().length;
  const canRefund = refundableGroups.length > 0; // 🔥 Stripe/Google/Apple 포함

  const couponTotal = sortedCoupons.length;
  const couponTotalPages = Math.max(1, Math.ceil(couponTotal / COUPON_PAGE_SIZE));
  const safeCouponPage = Math.min(Math.max(1, couponPage), couponTotalPages);
  const couponStart = (safeCouponPage - 1) * COUPON_PAGE_SIZE;
  const pageCoupons = sortedCoupons.slice(couponStart, couponStart + COUPON_PAGE_SIZE);

  return (
    <>
      {/* 🔥 fixed 네비게이션 */}
      {isUserLoaded && isSignedIn && (
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-white border-b"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button variant="outline" size="sm"
                onClick={() => router.push("/app")}
                className="h-8 shrink-0">
                Home
              </Button>
              {user?.primaryEmailAddress?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                <Button variant="outline" size="sm"
                  onClick={() => router.push("/admin")}
                  className="h-8 shrink-0 border-red-500 text-red-500">
                  Admin
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap text-right shrink-0">
              Contact:{" "}
              <a className="underline font-medium" href="mailto:help@manylangs.studio">
                ✉ help@manylangs.studio
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 콘텐츠 */}
      <main
        className="px-4 py-8"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 56px)" }}
      >
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
                          onClick={() => setLibraryPage((p) => Math.min(libraryTotalPages, p + 1))}
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <CardTitle>My Coupons</CardTitle>
                      <span className="text-xs text-gray-400">
                        Tap/click a code to copy
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRestorePurchases}
                      disabled={restoring}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {restoring ? "Restoring..." : "Restore Purchases"}
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">

                  <p className="text-xs text-gray-500 text-center">
                    If your latest coupons do not appear,
                    <br />
                    tap Restore Purchases.
                  </p>

                  {couponTotal === 0 && (
                    <p className="text-sm text-gray-500">
                      No coupons available.
                    </p>
                  )}

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
                          onClick={() => setCouponPage((p) => Math.min(couponTotalPages, p + 1))}
                          disabled={safeCouponPage === couponTotalPages}
                          aria-label="Next page"
                        >
                          {">"}
                        </button>
                      </div>
                    </div>
                  )}

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
                            <div style={{ fontSize: 11, color: "#777" }}>
                              {usedBook}
                            </div>
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

                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Coupon code"
                    className="block w-full rounded border px-3 py-2"
                  />
                  <button
                    onClick={activateCoupon}
                    disabled={loading}
                    className="w-full rounded border py-2 text-sm font-medium"
                  >
                    {loading
                      ? "Processing..."
                      : `Add ${LANGUAGES.find(l => l.code === targetLang)?.label ?? ""
                      } textbook`}
                  </button>
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      1 coupon = 30-day access
                      <br />Coupons can be shared with others.
                      <br /> However, ManyLangs cannot individually track
                      <br />whether a shared coupon has been used.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Choose a plan</div>

                    {(() => {
                      const isMobileApp =
                        typeof window !== "undefined" &&
                        ((window as any).AndroidBridge ||
                          (window as any).webkit?.messageHandlers ||
                          navigator.userAgent.includes("ManyLangsApp/Android"));

                      const visiblePaymentOptions = isMobileApp
                        ? PAYMENT_OPTIONS.filter(p => p.amount === "3" || p.amount === "5")
                        : PAYMENT_OPTIONS;

                      return (
                        <>
                          <select
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value as Amount)}
                            className="block w-full rounded border px-3 py-2"
                          >
                            {visiblePaymentOptions.map((p) => (
                              <option key={p.amount} value={p.amount}>
                                {p.label} — {p.desc}
                              </option>
                            ))}
                          </select>

                          <div className="text-xs text-gray-500 space-y-1">
                            {visiblePaymentOptions.map((p) => (
                              <div key={p.amount}>
                                {p.label} → {p.coupons} coupons
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="space-y-2 pt-2">

                    <button
                      onClick={startPayment}
                      disabled={loading}
                      className="w-full rounded bg-black text-white py-2 text-sm font-medium"
                    >
                      Buy Coupons
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

                  <div className="text-xs text-center border rounded p-2 bg-yellow-50 text-gray-600">
                    {isIOS ? (
                      <>
                        Card purchases can be refunded here.
                        <br />
                        App Store purchases are handled directly by Apple according to App Store policies.
                      </>
                    ) : isAndroid ? (
                      <>
                        Card purchases can be refunded here.
                        <br />
                        Google Play purchases are handled directly by Google Play according to Google Play policies.
                      </>
                    ) : (
                      <>
                        Card purchases can be refunded here.
                      </>
                    )}
                  </div>

                  {refundError && (
                    <p className="text-xs text-red-500 text-center">
                      {isIOS ? (
                        <>
                          No card purchases to refund here.
                          <br />
                          App Store purchases are handled directly by Apple.
                        </>
                      ) : isAndroid ? (
                        <>
                          No card purchases to refund here.
                          <br />
                          Google Play purchases are handled directly by Google Play.
                        </>
                      ) : (
                        <>
                          No card purchases to refund here.
                          <br />
                          Google Play purchases → refund via Google Play.
                          <br />
                          Apple purchases → refund via Apple.
                        </>
                      )}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loading || refundPreviewOpen}
                    onClick={handleRefundCheck}
                  >
                    Refund Eligible Purchases
                  </Button>
                  {refundPreviewOpen && (
                    <div className="border rounded p-3 text-center space-y-2 bg-gray-50">

                      <div className="text-sm font-semibold">
                        {stripeRefundableGroups.length > 0 ? "Refund available" : "Refund Info"}
                      </div>

                      {stripeRefundableGroups.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {refundablePurchaseCount} purchase
                          {refundablePurchaseCount > 1 ? "s" : ""} ({refundableCouponCount} coupons)
                        </div>
                      )}

                      {refundPreviewGroups.some((g: any) => g[0]?.purchaseToken) && !isIOS && (
                        <div className="text-xs text-orange-500 font-medium">
                          Google Play purchases are handled directly by Google Play.
                        </div>
                      )}

                      {refundPreviewGroups.some((g: any) => g[0]?.transactionId) && !isAndroid && (
                        <div className="text-xs text-orange-500 font-medium">
                          App Store purchases are handled directly by Apple.
                        </div>
                      )}

                      {stripeRefundableGroups.length > 0 && (
                        <>
                          <div className="text-xs text-gray-500">
                            Do you want to proceed with the refund?
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button className="w-full" onClick={requestRefund}>
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
                        </>
                      )}

                      {stripeRefundableGroups.length === 0 && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setRefundPreviewOpen(false)}
                          >
                            Close
                          </Button>
                        </div>
                      )}

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
    </>
  );
}