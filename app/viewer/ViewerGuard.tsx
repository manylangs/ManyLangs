"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

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
  const { userId, isLoaded } = useAuth();

  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  const req = useMemo(() => parseViewerPath(pathname), [pathname]);
  console.log("ViewerGuard pathname:", pathname);

  useEffect(() => {
    console.log("isLoaded:", isLoaded);
    console.log("userId:", userId);
    console.log("req:", req);
    if (!isLoaded) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    if (!req) {
      setAuthorized(true);
      setChecked(true);
      return;
    }

    const verify = async () => {
      try {
        console.log("REQ:", req);

        const res = await fetch("/api/licenses/list", {
          method: "POST",
          cache: "no-store",
        });

        if (!res.ok) {
          router.replace("/select-books");
          return;
        }

        const data = await res.json();

        console.log("SERVER LICENSES:", data.licenses);

        const reqLang = req.lang || "kr";
        const reqSeries = req.series;
        const reqLevel = normalizeLevel(req.series, req.level);
        const now = Date.now();

        console.log("CHECKING:", {
          reqLang,
          reqSeries,
          reqLevel,
          now,
        });

        const hit = data.licenses?.find((item: any) => {
          const itemLevel = normalizeLevel(item.series, item.level);

          console.log("COMPARE:", {
            itemLang: item.lang,
            itemSeries: item.series,
            itemLevel: item.level,
            normalizedItemLevel: itemLevel,
            expiresAt: item.expiresAt,
            isValid: item.expiresAt > now,
          });

          return (
            item.lang === reqLang &&
            item.series === reqSeries &&
            itemLevel === reqLevel &&
            item.expiresAt > now
          );
        });

        console.log("HIT RESULT:", hit);

        if (!hit) {
          router.replace("/select-books");
          return;
        }

        setAuthorized(true);
      } catch (e) {
        console.log("VERIFY ERROR:", e);
        router.replace("/select-books");
      } finally {
        setChecked(true);
      }
    };

    verify();
  }, [req, router, isLoaded, userId]);

  // 🔥 검증 완료 전에는 절대 렌더 금지
  if (!checked) return null;

  // 🔥 인증 실패면 절대 렌더 금지
  if (!authorized) return null;

  return <>{children}</>;
}