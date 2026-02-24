"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function ViewerGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();

  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  const req = useMemo(() => parseViewerPath(pathname), [pathname]);

  useEffect(() => {
    // 🔥 Clerk 세션 복원 완료까지 절대 아무것도 하지 않음
    if (!isLoaded) return;

    // 🔥 로그인 안 되어 있으면 로그인 페이지로
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    // viewer 경로가 아니면 통과
    if (!req) {
      setAuthorized(true);
      setChecked(true);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/licenses/list", {
          method: "POST",
          cache: "no-store",
          credentials: "include", // 🔥 세션 쿠키 확실히 포함
        });

        // 🔥 401이면 아직 세션 복원 중일 수 있으므로 바로 차단하지 않음
        if (res.status === 401) {
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
        const now = data.serverNowMs || Date.now();

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
      } catch (e) {
        router.replace("/select-books");
      } finally {
        setChecked(true);
      }
    };

    verify();
  }, [req, router, isLoaded, isSignedIn]);

  // 🔥 인증 복원 전엔 렌더 금지
  if (!isLoaded) return null;

  // 🔥 검증 완료 전 렌더 금지
  if (!checked) return null;

  // 🔥 인증 실패 렌더 금지
  if (!authorized) return null;

  return <>{children}</>;
}