"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type ViewerTargetContextValue = {
  /** ✅ 단일 소스 오브 트루스 */
  showTarget: boolean;
  setShowTarget: Dispatch<SetStateAction<boolean>>;
  toggleShowTarget: () => void;

  /**
   * ✅ 호환성(alias)
   * - 기존 ViewerHeader가 showTargetText/toggleTargetText를 쓰고 있으니 유지
   * - 내부적으로는 showTarget 하나로만 관리
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
  const [showTarget, setShowTarget] = useState<boolean>(initialShowTarget);

  const toggleShowTarget = useCallback(() => {
    setShowTarget((prev) => !prev);
  }, []);

  const value = useMemo<ViewerTargetContextValue>(() => {
    return {
      showTarget,
      setShowTarget,
      toggleShowTarget,

      // alias (동일 상태를 다른 이름으로 노출)
      showTargetText: showTarget,
      toggleTargetText: toggleShowTarget,
    };
  }, [showTarget, toggleShowTarget]);

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
