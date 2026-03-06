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

type ViewerTargetContextValue = {
  /** 🎯 Language you want to learn */
  targetLang: string;
  setTargetLang: Dispatch<SetStateAction<string>>;

  /** 🎯 learner language */
  studyLang: string;
  setStudyLang: Dispatch<SetStateAction<string>>;

  /** ✅ 단일 소스 오브 트루스 */
  showTarget: boolean;
  setShowTarget: Dispatch<SetStateAction<boolean>>;
  toggleShowTarget: () => void;

  /**
   * ✅ 호환성(alias)
   * - 기존 ViewerHeader가 showTargetText/toggleTargetText를 쓰고 있으니 유지
   */
  showTargetText: boolean;
  toggleTargetText: () => void;
};

const ViewerTargetContext = createContext<ViewerTargetContextValue | null>(null);

export function ViewerTargetProvider({
  children,
  initialShowTarget = true,
}: {
  children: ReactNode;
  initialShowTarget?: boolean;
}) {

  /** 🔥 Language you want to learn */
  const [targetLang, setTargetLang] = useState<string>("kr");

  /** 🔥 learner language */
  const [studyLang, setStudyLang] = useState<string>("en");

  const [showTarget, setShowTarget] = useState<boolean>(initialShowTarget);

  const toggleShowTarget = useCallback(() => {
    setShowTarget((prev) => !prev);
  }, []);

  /**
   * 🔹 핵심 수정
   * select-books 페이지에서 저장한
   * ml_target_lang 복구
   */
  useEffect(() => {
    const saved = localStorage.getItem("ml_target_lang");
    if (saved) {
      setTargetLang(saved);
    }
  }, []);

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
  }, [
    targetLang,
    studyLang,
    showTarget,
    toggleShowTarget
  ]);

  return (
    <ViewerTargetContext.Provider value={value}>
      {children}
    </ViewerTargetContext.Provider>
  );
}

export function useViewerTarget(): ViewerTargetContextValue {
  const ctx = useContext(ViewerTargetContext);

  if (!ctx) {
    throw new Error("useViewerTarget must be used within ViewerTargetProvider");
  }

  return ctx;
}