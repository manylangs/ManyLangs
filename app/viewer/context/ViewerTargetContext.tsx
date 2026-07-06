"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { SUPPORTED_LANGS } from "@/app/config/languages";

/* ================= 타입 ================= */

type ViewerTargetContextValue = {
  targetLang: string;
  setTargetLang: Dispatch<SetStateAction<string>>;

  studyLang: string;
  setStudyLang: Dispatch<SetStateAction<string>>;

  showTarget: boolean;
  setShowTarget: Dispatch<SetStateAction<boolean>>;
  toggleShowTarget: () => void;

  showTargetText: boolean;
  toggleTargetText: () => void;
};

const ViewerTargetContext =
  createContext<ViewerTargetContextValue | null>(null);

/* ================= Provider ================= */

export function ViewerTargetProvider({
  children,
  initialShowTarget = true,
}: {
  children: ReactNode;
  initialShowTarget?: boolean;
}) {
  /** 🎯 target language */
  const [targetLang, setTargetLang] = useState<string>("en");

  /** 🎯 study language */
  const [studyLang, setStudyLang] = useState<string>("en");

  const [showTarget, setShowTarget] =
    useState<boolean>(initialShowTarget);

  const toggleShowTarget = useCallback(() => {
    setShowTarget((prev) => !prev);
  }, []);

  /* ================= 핵심: demo + 일반 분기 ================= */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = window.location.pathname;
    const isDemo = path.startsWith("/demo");

    // ✅ 1. 데모뷰어 → URL 기준
    if (isDemo) {
      const parts = path.split("/");
      const urlLang = parts[3]; // /demo/viewer/{lang}

      if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
        setTargetLang(urlLang);
        return;
      }
    }

    // ✅ 2. 일반뷰어 → localStorage 유지
    const saved = localStorage.getItem("ml_target_lang");

    const lang =
      saved && SUPPORTED_LANGS.includes(saved)
        ? saved
        : "en";

    setTargetLang(lang);
    localStorage.setItem("ml_target_lang", lang);
  }, []);

  /* ================= studyLang 자동 설정 ================= */

  /* ================= memo ================= */

  const value = useMemo<ViewerTargetContextValue>(() => {
    return {
      targetLang,
      setTargetLang,

      studyLang,
      setStudyLang,

      showTarget,
      setShowTarget,
      toggleShowTarget,

      // alias
      showTargetText: showTarget,
      toggleTargetText: toggleShowTarget,
    };
  }, [targetLang, studyLang, showTarget, toggleShowTarget]);

  return (
    <ViewerTargetContext.Provider value={value}>
      {children}
    </ViewerTargetContext.Provider>
  );
}

/* ================= hook ================= */

export function useViewerTarget(): ViewerTargetContextValue {
  const ctx = useContext(ViewerTargetContext);

  if (!ctx) {
    throw new Error(
      "useViewerTarget must be used within ViewerTargetProvider"
    );
  }

  return ctx;
}