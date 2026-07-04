"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface LangMeta {
  language: string;
  label: string;
  flag: string;
}

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
  const [langs, setLangs] = useState<LangMeta[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/admin/crm/youtube/collect")
      .then((r) => r.json())
      .then((d) => setLangs(d.languages ?? []));
  }, []);

  const handleCollect = async (language: string) => {
    setLoading(language);
    try {
      const res = await fetch("/api/admin/crm/youtube/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const data: CollectResult = await res.json();
      setHistory((prev) => [
        { language, result: data, completedAt: new Date().toLocaleString("ko-KR") },
        ...prev,
      ]);
    } catch (e: any) {
      setHistory((prev) => [
        {
          language,
          result: { success: false, language, searched: 0, inserted: 0, duplicated: 0, skipped: 0, error: e.message },
          completedAt: new Date().toLocaleString("ko-KR"),
        },
        ...prev,
      ]);
    } finally {
      setLoading(null);
    }
  };

  const lastResult = (key: string) => history.find((h) => h.language === key);

  const allLangs: LangMeta[] = [
    ...langs,
    { language: "all", label: "Collect All", flag: "🌐" },
  ];

  return (

    <div style={{ padding: 40, maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>🎥 YouTube Teacher Collector</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 32 }}>
        최근 365일 내 활동 · 연락처/SNS 링크 보유 채널 수집 · {langs.length}개 언어 지원
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 40 }}>
        {allLangs.map((lang) => {
          const isRunning = loading === lang.language;
          const isDisabled = loading !== null;
          const last = lastResult(lang.language);
          const succeeded = last?.result.success;

          return (
            <button
              key={lang.language}
              onClick={() => handleCollect(lang.language)}
              disabled={isDisabled}
              style={{
                padding: "16px 12px",
                borderRadius: 10,
                border: `2px solid ${succeeded ? "#22c55e" : isRunning ? "#111" : "#e5e7eb"}`,
                background: isRunning ? "#111" : succeeded ? "#f0fdf4" : "#fafafa",
                color: isRunning ? "#fff" : "#111",
                fontSize: 13,
                fontWeight: 600,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled && !isRunning ? 0.45 : 1,
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{lang.flag}</div>
              <div>{isRunning ? "수집 중..." : lang.label}</div>
              {succeeded && !isRunning && (
                <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                  ✅ +{last!.result.inserted}건 저장
                </div>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{
          padding: "14px 18px", borderRadius: 8, background: "#fffbeb",
          border: "1px solid #fcd34d", marginBottom: 28, fontSize: 13, color: "#92400e",
        }}>
          ⏳ <strong>{loading === "all" ? "전체 언어 (Collect All)" : loading}</strong> 수집 중...
          {loading === "all" && (
            <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7 }}>5개 언어 순차 처리 (최대 5~10분)</span>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>수집 결과 히스토리</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                {["언어", "검색된 채널", "신규 저장", "중복", "필터링", "상태", "완료 시각"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => {
                const meta = allLangs.find((l) => l.language === entry.language);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 14px" }}>{meta?.flag} {entry.language}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>{entry.result.searched}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#16a34a", fontWeight: 700 }}>+{entry.result.inserted}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#6b7280" }}>{entry.result.duplicated}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#9ca3af" }}>{entry.result.skipped}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {entry.result.success
                        ? <span style={{ color: "#16a34a" }}>✅ 성공</span>
                        : <span style={{ color: "#dc2626" }}>❌ {entry.result.error}</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 11 }}>{entry.completedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: 40, padding: 20, borderRadius: 10,
        background: "#f8fafc", border: "1px solid #e2e8f0",
        fontSize: 12, color: "#64748b", lineHeight: 1.8,
      }}>
        <strong style={{ color: "#334155", fontSize: 13 }}>📦 새 언어 추가 방법</strong><br />
        1. <code>src/config/youtube/newlang.ts</code> 생성<br />
        2. <code>src/config/youtube/index.ts</code> 에 import + 배열 추가<br />
        3. 배포 → 버튼 자동 생성. Collector 코드 수정 불필요.
      </div>
    </div>
  );
}
