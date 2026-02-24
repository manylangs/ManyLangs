"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

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

function normalizeLevel(series: string, level: string) {
  if (series === "voca" || series === "idiom") return "all";
  return level;
}

export default function ViewerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();

  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  const req = useMemo(() => parseViewerPath(pathname), [pathname]);

  // 동시 검증 방지
  const inFlightRef = useRef(false);

  const verify = async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setAuthorized(false);
      setChecked(true);
      router.replace("/login");
      return;
    }

    if (!req) {
      setAuthorized(true);
      setChecked(true);
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // 🔥 bfcache 복귀 시 “잠깐 보임” 방지
    setChecked(false);
    setAuthorized(false);

    try {
      const doFetch = () =>
        fetch("/api/licenses/list", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
        });

      let res = await doFetch();

      // 🔥 401은 세션 복원/타이밍일 수 있어 1회 재시도
      if (res.status === 401) {
        res = await doFetch();
      }

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        router.replace("/select-books");
        return;
      }

      const data = await res.json();

      const reqLang = req.lang || "kr";
      const reqSeries = req.series;
      const reqLevel = normalizeLevel(req.series, req.level);
      if (typeof data.serverNowMs !== "number") {
        router.replace("/select-books");
        return;
      }

      const now = data.serverNowMs;
      const hit = data.licenses?.find((item: any) => {
        const itemLevel = normalizeLevel(item.series, item.level);
        return (
          item.lang === reqLang &&
          item.series === reqSeries &&
          itemLevel === reqLevel &&
          item.expiresAt > now
        );
      });

      if (!hit) {
        router.replace("/select-books");
        return;
      }

      setAuthorized(true);
    } catch {
      router.replace("/select-books");
    } finally {
      inFlightRef.current = false;
      setChecked(true);
    }
  };

  // 최초/경로변경 검증
  useEffect(() => {
    if (!isLoaded) return;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.lang, req?.series, req?.level, isLoaded, isSignedIn]);

  // 🔥 bfcache/탭복귀/포커스복귀에서도 재검증
  useEffect(() => {
    if (!req) return;

    const onPageShow = () => verify(); // 뒤로/앞으로(bfcache 포함)
    const onVis = () => {
      if (document.visibilityState === "visible") verify();
    };
    const onFocus = () => verify();

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.lang, req?.series, req?.level, isLoaded, isSignedIn]);

  if (!isLoaded) return null;
  if (!checked) return null;
  if (!authorized) return null;

  return <>{children}</>;
}