"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { License } from "@/lib/license";

function parseViewerPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("viewer");
  if (idx === -1) return null;

  return {
    lang: parts[idx + 1] || "kr",
    series: parts[idx + 2] || "",
    level: parts[idx + 3] || "",
  };
}

function normalizeLang(lang: string) {
  const v = (lang || "").toLowerCase();
  if (v === "ko") return "kr";
  return v;
}

function normalizeSeries(series: string) {
  const v = (series || "").toLowerCase();
  if (v === "vocabulary") return "voca";
  if (v === "idioms") return "idiom";
  return v;
}

function normalizeLevel(series: string, level: string) {
  const s = normalizeSeries(series);
  const l = (level || "").toLowerCase();
  if (s === "voca" || s === "idiom") return "all";
  return l;
}

type LicensesListResponse =
  | { ok: true; items: License[] }
  | { ok: false; error?: string }
  // ✅ 현재 API 포맷(success/licenses)도 같이 허용
  | { success: true; licenses: License[]; serverNowMs?: number }
  | { success?: false; error?: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function ViewerGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, isLoaded, getToken } = useAuth();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const req = useMemo(() => parseViewerPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLicensesWithRetry(): Promise<License[] | null> {
      const maxTry = 6;
      const delays = [0, 200, 300, 450, 650, 900];

      for (let i = 0; i < maxTry; i++) {
        if (cancelled) return null;
        if (delays[i]) await sleep(delays[i]);

        // auth 준비/로그인 확인
        if (!userId) return null;

        const token = await getToken().catch(() => null);
        // token 없으면 일단 재시도 (Clerk 세션 타이밍)
        if (!token) continue;

        // ✅✅✅ 핵심 변경: POST body에 userId 전달
        const res = await fetch("/api/licenses/list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }), // ✅ 이 한 줄이 400을 없앤다
          cache: "no-store",
        });

        console.log("[ViewerGuard] /api/licenses/list status:", res.status);

        if (res.status === 401 || res.status === 403) continue;
        if (!res.ok) continue;

        const data = (await res.json().catch(() => null)) as LicensesListResponse | null;
        console.log("[ViewerGuard] list response:", data);

        if (!data || typeof data !== "object") continue;

        // ✅ ok/items 포맷
        if ("ok" in data && (data as any).ok === true) {
          const items = Array.isArray((data as any).items) ? ((data as any).items as License[]) : [];
          if (items.length === 0) continue;
          return items;
        }

        // ✅ success/licenses 포맷 (현재 네 API)
        if ("success" in data && (data as any).success === true) {
          const licenses = Array.isArray((data as any).licenses)
            ? ((data as any).licenses as License[])
            : [];
          if (licenses.length === 0) continue;
          return licenses;
        }

        // 그 외 포맷이면 재시도
      }

      return null;
    }

    async function run() {
      if (!isLoaded) return;

      if (!userId) {
        router.replace("/login");
        return;
      }

      if (!req) {
        if (cancelled) return;
        setAllowed(true);
        setReady(true);
        return;
      }

      const reqLang = normalizeLang(req.lang || "kr");
      const reqSeries = normalizeSeries(req.series);
      const reqLevel = normalizeLevel(req.series, req.level);

      console.log("[ViewerGuard] req:", { reqLang, reqSeries, reqLevel });

      const items = await fetchLicensesWithRetry();

      if (!items) {
        console.warn("[ViewerGuard] items not loaded -> redirect");
        router.replace("/select-books");
        return;
      }

      const now = Date.now();

      const hit = items.find((item) => {
        const itemLang = normalizeLang(item.lang);
        const itemSeries = normalizeSeries(item.series);
        const itemLevel = normalizeLevel(item.series, item.level);
        return itemLang === reqLang && itemSeries === reqSeries && itemLevel === reqLevel;
      });

      console.log("[ViewerGuard] hit:", hit);

      if (!hit || typeof hit.expiresAt !== "number" || hit.expiresAt <= now) {
        router.replace("/select-books");
        return;
      }

      if (cancelled) return;
      setAllowed(true);
      setReady(true);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [req, router, isLoaded, userId, getToken]);

  if (!ready) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
