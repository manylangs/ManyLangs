"use client";

export type LangKey = "en" | "es" | "fr" | "pt" | "kr";

type Props = {
  value: LangKey;
  onChange: (lang: LangKey) => void;
  available?: LangKey[];
};

const LABELS: Record<LangKey, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  kr: "Korean",
};

export default function LangTabs({
  value,
  onChange,
  available = ["en", "es", "fr", "pt"],
}: Props) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {available.map(lang => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: value === lang ? "#ddd" : "#fff",
          }}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
