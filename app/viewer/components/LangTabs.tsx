"use client";

import Link from "next/link";
import { UI_TARGET_LABELS, UiLangKey } from "../uiLabels";

const ORDERED_LANGS: UiLangKey[] = ["en", "es", "pt", "fr", "kr"];

export default function LangTabs({ currentLang }: { currentLang: UiLangKey }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {ORDERED_LANGS.map((code) => {
        const label = UI_TARGET_LABELS[code]; // ✅ 무조건 string 구조

        const text =
          code === "en" ? "English" : `${label.native} (${label.en})`;

        return (
          <Link
            key={code}
            href={`/viewer/${code}`}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 14,
              background: currentLang === code ? "#333" : "#eee",
              color: currentLang === code ? "#fff" : "#333",
              border: "none",
              cursor: currentLang === code ? "default" : "pointer",
              textDecoration: "none",
            }}
          >
            {text}
          </Link>
        );
      })}
    </div>
  );
}
