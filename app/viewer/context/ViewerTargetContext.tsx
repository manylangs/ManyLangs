"use client";

import { createContext, useContext, useEffect, useState } from "react";

const LEGACY_KEY = "showTargetLang";
const NEW_KEY = "viewer_show_target_text";

type Ctx = {
  ready: boolean;
  showTargetText: boolean;
  toggleTargetText: () => void;
};

const ViewerTargetContext = createContext<Ctx | null>(null);

export function ViewerTargetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 깜빡임 방지: hydration 전에는 기본 숨김(false)로 시작
  const [ready, setReady] = useState(false);
  const [showTargetText, setShowTargetText] = useState(false);

  useEffect(() => {
    const saved =
      localStorage.getItem(NEW_KEY) ?? localStorage.getItem(LEGACY_KEY);

    // 저장값이 없으면 기본 ON(true)
    const next = saved === null ? true : saved !== "false";

    setShowTargetText(next);
    setReady(true);
  }, []);

  function toggleTargetText() {
    setShowTargetText((prev) => {
      const next = !prev;
      localStorage.setItem(NEW_KEY, String(next));
      localStorage.setItem(LEGACY_KEY, String(next));
      return next;
    });
  }

  return (
    <ViewerTargetContext.Provider value={{ ready, showTargetText, toggleTargetText }}>
      {children}
    </ViewerTargetContext.Provider>
  );
}

export function useViewerTarget() {
  const ctx = useContext(ViewerTargetContext);
  if (!ctx) {
    throw new Error("useViewerTarget must be used inside ViewerTargetProvider");
  }
  return ctx;
}
