"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type License = {
  lang: string;
  series: string;
  level: string;
  expiresAt?: number;
  source?: "coupon" | "payment";
  code?: string;
};

// 안전 JSON 파서
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

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

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const req = useMemo(() => parseViewerPath(pathname), [pathname]);

  useEffect(() => {
    // viewer 경로 아니면 패스
    if (!req) {
      setAllowed(true);
      setReady(true);
      return;
    }

    // 목표언어 임시 고정
    const reqLang = "kr";
    const reqSeries = req.series;
    const reqLevel = normalizeLevel(req.series, req.level);

    const library = safeParse<License[]>(
      localStorage.getItem("library")
    ) || [];

    const ok = library.some((item) => {
      const itemLevel = normalizeLevel(item.series, item.level);
      return (
        item.lang === reqLang &&
        item.series === reqSeries &&
        itemLevel === reqLevel
      );
    });

    if (!ok) {
      router.replace("/select-books");
      return;
    }

    setAllowed(true);
    setReady(true);
  }, [req, router]);

  if (!ready) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
