"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { cleanExpiredLibrary, isExpired, type License } from "@/lib/license";

// /viewer/kr/grammar/a1/001 형태 기준
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

// series별 level 정규화
function normalizeLevel(series: string, level: string) {
  if (series === "voca" || series === "idiom") return "all";
  return level;
}

export default function ViewerGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, isLoaded } = useAuth();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const req = useMemo(() => parseViewerPath(pathname), [pathname]);

  useEffect(() => {
    // ✅ auth 준비 전에는 판단하지 않음
    if (!isLoaded) return;

    // ✅ 로그아웃 상태면 로그인으로
    if (!userId) {
      router.replace("/login");
      return;
    }

    // viewer 경로 아니면 패스
    if (!req) {
      setAllowed(true);
      setReady(true);
      return;
    }

    const reqLang = req.lang || "kr";
    const reqSeries = req.series;
    const reqLevel = normalizeLevel(req.series, req.level);

    // ✅ ✅ ✅ (변경 포인트) 계정별 라이브러리로 만료 정리 + 단일 진실
    const library: License[] = cleanExpiredLibrary(userId);

    const hit = library.find((item) => {
      const itemLevel = normalizeLevel(item.series, item.level);
      return (
        item.lang === reqLang &&
        item.series === reqSeries &&
        itemLevel === reqLevel
      );
    });

    // ❌ 미보유 or 만료 → 차단
    if (!hit || isExpired(hit.expiresAt)) {
      router.replace("/select-books");
      return;
    }

    setAllowed(true);
    setReady(true);
  }, [req, router, isLoaded, userId]);

  if (!ready) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
