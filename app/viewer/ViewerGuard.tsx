"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

    const reqLang = req.lang || "kr";
    const reqSeries = req.series;
    const reqLevel = normalizeLevel(req.series, req.level);

    // ✅ 만료 라이선스 정리 + 단일 진실
    const library: License[] = cleanExpiredLibrary();

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
  }, [req, router]);

  if (!ready) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
