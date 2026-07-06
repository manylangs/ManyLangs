"use client";

import { useViewerTarget } from "../context/ViewerTargetContext";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "../uiLabels";

export default function LangTabs() {
  const { targetLang, setTargetLang } = useViewerTarget();

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {(SUPPORTED_LANGS as UiLangKey[]).map((code) => {
        const label = UI_TARGET_LABELS[code];
        const text =
          code === "en" ? "English" : `${label.native} (${label.en})`;
        const active = targetLang === code;

        return (
          <button
            key={code}
            onClick={() => setTargetLang(code)}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 14,
              background: active ? "#333" : "#eee",
              color: active ? "#fff" : "#333",
              border: "none",
              cursor: active ? "default" : "pointer",
            }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}