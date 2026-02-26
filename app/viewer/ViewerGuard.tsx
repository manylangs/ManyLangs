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

  // ✅ 동시 검증 방지 + 연속 이벤트 합치기
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  // ✅ 쿨다운(너무 자주 호출 방지)
  const lastVerifyAtRef = useRef(0);
  const COOLDOWN_MS = 600; // 필요시 400~900 조절

  // ✅ 이전 요청 abort
  const abortRef = useRef<AbortController | null>(null);

  const hardBlock = () => {
    // 🔥 bfcache/깜빡임 방지: 검증 중엔 절대 보여주지 않음
    setChecked(false);
    setAuthorized(false);
  };

  const finish = (ok: boolean) => {
    setAuthorized(ok);
    setChecked(true);
  };

  const verify = async (reason: string) => {
    if (!isLoaded) return;

    // viewer가 아닌 페이지면 통과
    if (!req) {
      finish(true);
      return;
    }

    // 로그인 안 됨
    if (!isSignedIn) {
      finish(false);
      router.replace("/login");
      return;
    }

    const now = Date.now();

    // ✅ 쿨다운 적용: 짧은 시간 중복 호출 무시
    if (now - lastVerifyAtRef.current < COOLDOWN_MS) {
      return;
    }
    lastVerifyAtRef.current = now;

    // ✅ 이미 실행 중이면 pending만 표시하고 종료
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }

    inFlightRef.current = true;
    pendingRef.current = false;

    // 🔥 검증 시작 시 즉시 블록(깜빡임 방지)
    hardBlock();

    // ✅ 이전 요청 취소
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const doFetch = () =>
        fetch("/api/licenses/list", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

      let res = await doFetch();

      // ✅ 401은 세션 복원 타이밍일 수 있어 1회 재시도
      if (res.status === 401) res = await doFetch();

      if (res.status === 401) {
        finish(false);
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        finish(false);
        router.replace("/select-books");
        return;
      }

      const data = await res.json();

      const reqLang = req.lang || "kr";
      const reqSeries = req.series;
      const reqLevel = normalizeLevel(req.series, req.level);

      // ✅ 서버 시간 없으면 실패 처리(운영 안정성)
      if (typeof data.serverNowMs !== "number") {
        finish(false);
        router.replace("/select-books");
        return;
      }

      const serverNow = data.serverNowMs;

      const hit = data.licenses?.find((item: any) => {
        const itemLevel = normalizeLevel(item.series, item.level);
        return (
          item.lang === reqLang &&
          item.series === reqSeries &&
          itemLevel === reqLevel &&
          item.expiresAt > serverNow
        );
      });

      if (!hit) {
        finish(false);
        router.replace("/select-books");
        return;
      }

      // ✅ 통과
      finish(true);
    } catch (e: any) {
      // abort는 정상 케이스로 취급(새 verify가 덮어씀)
      if (e?.name === "AbortError") return;

      finish(false);
      router.replace("/select-books");
    } finally {
      inFlightRef.current = false;

      // ✅ 실행 끝났는데 그 사이 이벤트가 더 들어왔으면 1번만 추가 실행
      if (pendingRef.current) {
        pendingRef.current = false;
        // 쿨다운 무시하고 바로 재검증(단 1회)
        lastVerifyAtRef.current = 0;
        verify("pending-flush");
      }
    }
  };

  // ✅ 최초/경로변경 검증 (이것만으로도 보통 충분)
  useEffect(() => {
    if (!isLoaded) return;
    verify("route");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.lang, req?.series, req?.level, isLoaded, isSignedIn]);

  // ✅ bfcache/탭 복귀 등 추가 검증 (하지만 throttle/merge됨)
  useEffect(() => {
    if (!req) return;

    const onPageShow = (e: PageTransitionEvent) => {
      // persisted(bfcache)일 때 특히 중요
      verify(e?.persisted ? "pageshow-bfcache" : "pageshow");
    };

    const onVis = () => {
      if (document.visibilityState === "visible") verify("visibility");
    };

    const onFocus = () => verify("focus");

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