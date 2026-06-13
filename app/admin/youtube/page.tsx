"use client";
import { useState } from "react";

const LANGUAGES = [
  { key: "korean",     label: "Korean",      flag: "🇰🇷" },
  { key: "english",    label: "English",     flag: "🇺🇸" },
  { key: "spanish",    label: "Spanish",     flag: "🇪🇸" },
  { key: "french",     label: "French",      flag: "🇫🇷" },
  { key: "portuguese", label: "Portuguese",  flag: "🇧🇷" },
  { key: "all",        label: "Collect All", flag: "🌐" },
];

interface CollectResult {
  success: boolean;
  language: string;
  searched: number;
  inserted: number;
  duplicated: number;
  skipped: number;
  error?: string;
}

interface HistoryEntry {
  language: string;
  result: CollectResult;
  completedAt: string;
}

export default function YouTubePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleCollect = async (language: string) => {
    setLoading(language);
    const start = Date.now();

    try {
      const res = await fetch("/api/admin/crm/youtube/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const data: CollectResult = await res.json();

      setHistory((prev) => [
        {
          language,
          result: data,
          completedAt: new Date().toLocaleString("ko-KR"),
        },
        ...prev,
      ]);
    } catch (e: any) {
      setHistory((prev) => [
        {
          language,
          result: {
            success: false,
            language,
            searched: 0,
            inserted: 0,
            duplicated: 0,
            skipped: 0,
            error: e.message,
          },
          completedAt: new Date().toLocaleString("ko-KR"),
        },
        ...prev,
      ]);
    } finally {
      setLoading(null);
    }
  };

  const lastResult = (key: string) => history.find((h) => h.language === key);

  return (
    <div style={{ padding: 40, maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
        🎥 YouTube Teacher Collector
      </h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 32 }}>
        구독자 500명 이상 · 최근 180일 내 활동 · 연락처/SNS 링크 보유 채널만 수집
      </p>

      {/* Collection Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 40 }}>
        {LANGUAGES.map((lang) => {
          const isRunning = loading === lang.key;
          const isDisabled = loading !== null;
          const last = lastResult(lang.key);
          const succeeded = last?.result.success;

          return (
            <button
              key={lang.key}
              onClick={() => handleCollect(lang.key)}
              disabled={isDisabled}
              style={{
                padding: "18px 12px",
                borderRadius: 12,
                border: `2px solid ${succeeded ? "#22c55e" : isRunning ? "#111" : "#e5e7eb"}`,
                background: isRunning ? "#111" : succeeded ? "#f0fdf4" : "#fafafa",
                color: isRunning ? "#fff" : "#111",
                fontSize: 14,
                fontWeight: 600,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled && !isRunning ? 0.45 : 1,
                transition: "all 0.15s",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{lang.flag}</div>
              <div>{isRunning ? "수집 중..." : lang.label}</div>
              {isRunning && (
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                  YouTube API 호출 중 (최대 2~3분)
                </div>
              )}
              {succeeded && !isRunning && (
                <div style={{ fontSize: 11, color: "#16a34a", marginTop: 6 }}>
                  ✅ {last!.result.inserted}건 저장 완료
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Live status bar */}
      {loading && (
        <div style={{
          padding: "14px 18px",
          borderRadius: 8,
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          marginBottom: 28,
          fontSize: 13,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div>
            <strong>{loading}</strong> 수집 진행 중입니다.
            <br />
            <span style={{ fontSize: 11, opacity: 0.8 }}>
              검색(100 quota) → 채널 조회(1) → 영상 날짜(1/채널) 순서로 처리됩니다.
            </span>
          </div>
        </div>
      )}

      {/* Results Table */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>수집 결과 히스토리</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                  {["언어", "검색된 채널", "신규 저장", "중복", "필터링", "상태", "완료 시각"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 14px" }}>
                      {LANGUAGES.find((l) => l.key === entry.language)?.flag}{" "}
                      {entry.language}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      {entry.result.searched}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#16a34a", fontWeight: 700 }}>
                      +{entry.result.inserted}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#6b7280" }}>
                      {entry.result.duplicated}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#9ca3af" }}>
                      {entry.result.skipped}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {entry.result.success
                        ? <span style={{ color: "#16a34a" }}>✅ 성공</span>
                        : <span style={{ color: "#dc2626" }}>❌ {entry.result.error}</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 11 }}>
                      {entry.completedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Info */}
      <div style={{
        marginTop: 40,
        padding: 20,
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        fontSize: 12,
        color: "#64748b",
        lineHeight: 1.8,
      }}>
        <strong style={{ color: "#334155", fontSize: 13 }}>📊 YouTube API Quota 안내 (일일 한도: 10,000)</strong>
        <br />
        언어 1개 수집 시 약 <strong>800~1,200 quota</strong> 소모 (검색 8쿼리 × 100 + 채널/영상 조회)
        <br />
        전체 언어(5개) 수집 시 약 <strong>4,000~6,000 quota</strong> 소모 → 1일 2회 전체 수집 가능
        <br />
        Quota 초과 시 429 에러 발생 → 다음날 자동 초기화 (태평양 자정 기준)
      </div>
    </div>
  );
}