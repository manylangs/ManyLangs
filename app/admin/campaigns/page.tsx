"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Campaign {
  id: number;
  campaign_id: string;
  subject: string;
  country?: string;
  city?: string;
  status: string;
  target_count: number;
  created_at: string;
  sent_count?: number;
  opened_count?: number;
  open_rate?: number;
  clicked_count?: number;
  click_rate?: number;
}

interface SendResult {
  success: boolean;
  mode: string;
  campaign_id: string;
  target_count: number;
  sample: { name: string; email: string; status: string }[];
  message: string;
  error?: string;
}

const ALL_VALUE = "ALL";
const ALL_COUNTRY_LABEL = "All Countries";
const ALL_CITY_LABEL = "All Cities";
const PAGE_SIZE = 5;
const MAX_PAGE_BUTTONS = 5;

// 현재 페이지 기준 최대 MAX_PAGE_BUTTONS개의 페이지 번호만 계산
function getPageWindow(current: number, total: number): number[] {
  const start = Math.max(
    1,
    Math.min(current - Math.floor(MAX_PAGE_BUTTONS / 2), total - MAX_PAGE_BUTTONS + 1)
  );
  const end = Math.min(total, start + MAX_PAGE_BUTTONS - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // 국가 목록은 공용 (한 번만 로드)
  const [countries, setCountries] = useState<string[]>([]);

  // ── History / KPI scope (상단 필터 전용) ──────────────────────────────
  const [historyCountry, setHistoryCountry] = useState(ALL_VALUE);
  const [historyCity, setHistoryCity] = useState(ALL_VALUE);
  const [historyCities, setHistoryCities] = useState<string[]>([]);

  // ── Create Campaign scope (폼 전용) ───────────────────────────────────
  const [formCountry, setFormCountry] = useState(ALL_VALUE);
  const [formCity, setFormCity] = useState(ALL_VALUE);
  const [formCities, setFormCities] = useState<string[]>([]);

  // Form state
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // Target check state (상단 필터 scope 기준)
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCampaigns / PAGE_SIZE));
  const pageWindow = getPageWindow(page, totalPages);

  // Send state
  // NOTE: campaign_id 단위로 관리해야 특정 Campaign만 "Sending..." 상태가 됩니다.
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── 파일 업로드로 한 번에 등록 + 캠페인 생성 ──────────────────────────
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const [fileSubject, setFileSubject] = useState("");
  const [fileBody, setFileBody] = useState("");
  const [fileSubmitting, setFileSubmitting] = useState(false);
  const [fileMsg, setFileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    setFileTitle(baseName);
    if (!fileSubject) setFileSubject(baseName);

    const reader = new FileReader();
    reader.onload = () => {
      setFileText(String(reader.result || ""));
    };
    reader.readAsText(file);
  };

  const handleFileSubmit = async () => {
    if (!fileText.trim() || !fileTitle.trim() || !fileSubject.trim() || !fileBody.trim()) {
      setFileMsg({ ok: false, text: "파일, 제목, Subject, Body를 모두 입력하세요." });
      return;
    }

    setFileSubmitting(true);
    setFileMsg(null);

    try {
      const res = await fetch("/api/admin/crm/campaigns/from-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fileText,
          title: fileTitle,
          subject: fileSubject,
          body: fileBody,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFileMsg({
          ok: true,
          text: `✅ ${data.campaign_id} 생성 — 신규 ${data.imported}건 (파일 내 중복 ${data.total_matches - data.unique_in_file}건, 가짜 이메일 ${data.junk_filtered}건, 기존 DB 중복 ${data.duplicated_existing}건 제외)`,
        });
        setFileText("");
        setFileName("");
        setFileTitle("");
        setFileSubject("");
        setFileBody("");
        setPage(1);
        fetchCampaigns(historyCountry, historyCity, 1);
      } else {
        setFileMsg({ ok: false, text: `❌ ${data.error}` });
      }
    } catch (e: any) {
      setFileMsg({ ok: false, text: `❌ ${e.message}` });
    } finally {
      setFileSubmitting(false);
    }
  };

  const fetchCampaigns = async (
    targetCountry: string = historyCountry,
    targetCity: string = historyCity,
    targetPage: number = page
  ) => {
    try {
      const params = new URLSearchParams();

      if (targetCountry !== ALL_VALUE) params.set("country", targetCountry);
      if (targetCity !== ALL_VALUE) params.set("city", targetCity);
      params.set("page", String(targetPage));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(
        `/api/admin/crm/campaigns?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setCampaigns(data.campaigns ?? []);
      setTotalCampaigns(data.pagination?.total ?? 0);

      // KPI도 함께 갱신
      setReadyCount(data.kpi?.ready_to_send ?? 0);
      setSentCount(data.kpi?.sent ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch("/api/admin/crm/locations");
      const data = await res.json();
      setCountries(data.countries || []);
    } catch (e) {
      console.error(e);
    }
  };

  // History / Form 각각의 city 목록을 독립적으로 로드
  const fetchCities = async (
    selectedCountry: string,
    setter: (cities: string[]) => void
  ) => {
    if (selectedCountry === ALL_VALUE) {
      setter([]);
      return;
    }
    try {
      const params = new URLSearchParams({ country: selectedCountry });
      const res = await fetch(`/api/admin/crm/locations?${params.toString()}`);
      const data = await res.json();
      setter(data.cities || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  // History Country 변경 시 Campaign History 즉시 필터링 (1페이지로 리셋)
  useEffect(() => {
    setPage(1);
    fetchCampaigns(historyCountry, historyCity, 1);
    fetchCities(historyCountry, setHistoryCities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyCountry]);

  useEffect(() => {
    setPage(1);
    fetchCampaigns(historyCountry, historyCity, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyCity]);

  // Form Country 변경 시 폼 전용 city 목록만 갱신 (History에 영향 없음)
  useEffect(() => {
    fetchCities(formCountry, setFormCities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCountry]);

  // 페이지 변경 시
  useEffect(() => {
    fetchCampaigns(historyCountry, historyCity, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleCheckTarget = async () => {
    setChecking(true);
    setHasChecked(true);

    try {
      const params = new URLSearchParams();

      if (historyCountry !== ALL_VALUE) {
        params.set("country", historyCountry);
      }

      if (historyCity !== ALL_VALUE) {
        params.set("city", historyCity);
      }

      const url =
        params.toString().length > 0
          ? `/api/admin/crm/leads?${params.toString()}`
          : "/api/admin/crm/leads";

      const res = await fetch(
        `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json();
      const leads = data.leads ?? [];

      const readyLeads = leads.filter(
        (l: any) => l.campaign_status === "NEW"
      );
      const sentLeads = leads.filter(
        (l: any) => l.campaign_status === "SENT"
      );

      setReadyCount(readyLeads.length);
      setSentCount(sentLeads.length);
    } catch (e) {
      console.error(e);
      setReadyCount(0);
      setSentCount(0);
    } finally {
      setChecking(false);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !emailBody.trim()) {
      setCreateMsg("❌ Subject와 Email Body를 입력하세요.");
      return;
    }
    setCreating(true);
    setCreateMsg("");
    try {
      const res = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formCountry,
          city: formCity,
          subject,
          body: emailBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateMsg(`✅ 생성 완료 — ${data.campaign_id} (대상: ${data.target_count}건)`);
        setSubject("");
        setEmailBody("");
        setPage(1);
        // History는 History scope 기준으로 갱신
        fetchCampaigns(historyCountry, historyCity, 1);
      } else {
        setCreateMsg(`❌ ${data.error}`);
      }
    } catch (e: any) {
      setCreateMsg(`❌ ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleTestSend = async (campaign_id: string) => {
    // 이미 다른 Campaign이 발송 중이면 중복 실행 방지
    if (sendingId !== null) return;

    setSendingId(campaign_id);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/crm/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id }),
      });
      const data: SendResult = await res.json();

      setSendResult(data);

      // Campaign History + READY/SENT KPI 갱신
      await fetchCampaigns(historyCountry, historyCity, page);
    } catch (e: any) {
      setSendResult({ success: false, mode: "TEST", campaign_id, target_count: 0, sample: [], message: "", error: e.message });
    } finally {
      setSendingId(null);
    }
  };

  const handleReset = async () => {
    if (!confirm("현재 선택한 범위의 SENT를 READY로 되돌리시겠습니까?")) return;

    try {
      const res = await fetch("/api/admin/crm/campaigns/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: historyCountry,
          city: historyCity,
        }),
      });

      const data = await res.json();

      alert(`복구 완료 (${data.updated}건)`);

      await fetchCampaigns(historyCountry, historyCity, page);

      if (hasChecked) {
        await handleCheckTarget();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div style={{ padding: 40, color: "#888" }}>Loading...</div>;

  return (

    <div style={{ padding: 40, maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>📧 Campaigns</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 32 }}>
        SES 연결 완료. TEST SEND는 실제 이메일을 발송합니다.
      </p>

      {/* History scope selector — Campaign History / KPI / Reset 전용 필터 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <label style={labelStyle}>
          Country
          <select
            value={historyCountry}
            onChange={(e) => {
              setHistoryCountry(e.target.value);
              setHistoryCity(ALL_VALUE);
              setHasChecked(false);
            }}
            style={selectStyle}
          >
            <option value={ALL_VALUE}>{ALL_COUNTRY_LABEL}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          City
          <select
            value={historyCity}
            disabled={historyCountry === ALL_VALUE}
            onChange={(e) => {
              setHistoryCity(e.target.value);
              setHasChecked(false);
            }}
            style={selectStyle}
          >
            <option value={ALL_VALUE}>{ALL_CITY_LABEL}</option>
            {historyCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleCheckTarget}
          disabled={checking}
          style={{ ...btnPrimary, marginTop: 18, opacity: checking ? 0.6 : 1 }}
        >
          {checking ? "조회 중..." : "🔍 Check Target"}
        </button>
        <button
          onClick={handleReset}
          disabled={sendingId !== null || checking}
          style={{
            ...btnPrimary,
            marginTop: 18,
            background: "#dc2626",
          }}
        >
          ↩ Reset SENT
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 40 }}>
        {[
          { label: "READY TO SEND", value: hasChecked ? readyCount : 0, color: "#7c3aed" },
          { label: "SENT", value: hasChecked ? sentCount : 0, color: "#16a34a" },
        ].map((c) => (
          <div key={c.label} style={{
            background: c.color, color: "#fff", borderRadius: 12,
            padding: "20px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value.toLocaleString()}</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>{c.label}</div>
          </div>
        ))}
      </div>
      {!hasChecked && (
        <p style={{ color: "#9ca3af", fontSize: 12, marginTop: -28, marginBottom: 32 }}>
          Country / City 선택 후 Check Target을 눌러야 대상 수가 표시됩니다.
        </p>
      )}

      {/* Create Campaign Form — 폼 전용 Country/City (History 필터와 독립) */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>새 Campaign 생성</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <label style={labelStyle}>
            Country
            <select
              value={formCountry}
              onChange={(e) => {
                setFormCountry(e.target.value);
                setFormCity(ALL_VALUE);
              }}
              style={selectStyle}
            >
              <option value={ALL_VALUE}>{ALL_COUNTRY_LABEL}</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            City
            <select
              value={formCity}
              disabled={formCountry === ALL_VALUE}
              onChange={(e) => setFormCity(e.target.value)}
              style={selectStyle}
            >
              <option value={ALL_VALUE}>{ALL_CITY_LABEL}</option>
              {formCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ ...labelStyle, display: "block", marginBottom: 16 }}>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: ManyLangs Partner Invitation"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </label>

        <label style={{ ...labelStyle, display: "block", marginBottom: 20 }}>
          Email Body
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={6}
            placeholder={"안녕하세요,\n\nManyLangs 파트너십 제안드립니다...\n\n감사합니다."}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleCreate} disabled={creating} style={btnPrimary}>
            {creating ? "생성 중..." : "✅ Campaign 생성"}
          </button>
          {createMsg && (
            <span style={{ fontSize: 13, color: createMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
              {createMsg}
            </span>
          )}
        </div>
      </div>

      {/* 파일 업로드로 한 번에 등록 + 캠페인 생성 */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>📁 파일로 캠페인 생성</h2>
        <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 20 }}>
          이메일 목록이 담긴 .txt / .rtf / .csv 파일을 업로드하면, 안의 이메일을 자동으로 추출하고
          (파일 내부 중복 · 가짜 이메일 · 이미 DB에 있는 이메일을 모두 제외한 뒤) 파일 제목으로 DRAFT 캠페인을 바로 생성합니다.
        </p>

        <label style={{ ...labelStyle, display: "block", marginBottom: 16 }}>
          파일 선택
          <input
            type="file"
            accept=".txt,.rtf,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
          {fileName && (
            <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              선택됨: {fileName} ({fileText.length.toLocaleString()}자)
            </span>
          )}
        </label>

        <label style={{ ...labelStyle, display: "block", marginBottom: 16 }}>
          제목 (캠페인 식별용, 기본값 = 파일명)
          <input
            value={fileTitle}
            onChange={(e) => setFileTitle(e.target.value)}
            placeholder="예: mexico_en_"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </label>

        <label style={{ ...labelStyle, display: "block", marginBottom: 16 }}>
          Subject
          <input
            value={fileSubject}
            onChange={(e) => setFileSubject(e.target.value)}
            placeholder="예: ManyLangs Partner Invitation"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </label>

        <label style={{ ...labelStyle, display: "block", marginBottom: 20 }}>
          Email Body
          <textarea
            value={fileBody}
            onChange={(e) => setFileBody(e.target.value)}
            rows={6}
            placeholder={"안녕하세요,\n\nManyLangs 파트너십 제안드립니다...\n\n감사합니다."}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleFileSubmit} disabled={fileSubmitting} style={btnPrimary}>
            {fileSubmitting ? "처리 중..." : "📁 등록 + Campaign 생성"}
          </button>
          {fileMsg && (
            <span style={{ fontSize: 13, color: fileMsg.ok ? "#16a34a" : "#dc2626" }}>
              {fileMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Send Result */}
      {sendResult && (
        <div style={{
          border: `1px solid ${sendResult.success ? "#86efac" : "#fca5a5"}`,
          borderRadius: 10,
          padding: 20,
          marginBottom: 32,
          background: sendResult.success ? "#f0fdf4" : "#fef2f2",
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            {sendResult.success ? "✅ 이메일 발송 완료" : `❌ 오류: ${sendResult.error}`}
          </div>
          {sendResult.success && (
            <>
              <div>Campaign ID: <strong>{sendResult.campaign_id}</strong></div>
              <div>발송 예정 대상: <strong>{sendResult.target_count}건</strong></div>
              <div style={{ marginTop: 8, color: "#6b7280" }}>{sendResult.message}</div>
              {sendResult.sample.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>샘플 대상 (최대 5건):</div>
                  {sendResult.sample.map((s, i) => (
                    <div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: "#374151" }}>
                      {s.name} — {s.email} [{s.status}]
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Campaign History */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Campaign History</h2>
        {campaigns.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>조건에 맞는 Campaign이 없습니다.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                    {["Campaign ID", "Subject", "Country", "City", "대상 수", "Sent", "Opened", "Open %", "Clicked", "Click %", "Status", "Test Send", "생성일"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const isSendingThis = sendingId === c.campaign_id;
                    const isSendingAny = sendingId !== null;

                    const statusColors: Record<string, { bg: string; fg: string }> = {
                      DRAFT: { bg: "#f3f4f6", fg: "#6b7280" },
                      READY: { bg: "#dcfce7", fg: "#16a34a" },
                      SENDING: { bg: "#fef9c3", fg: "#ca8a04" },
                      SENT: { bg: "#dbeafe", fg: "#2563eb" },
                    };
                    const statusStyle = statusColors[c.status] ?? statusColors.DRAFT;

                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{c.campaign_id}</td>
                        <td style={{ padding: "10px 14px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</td>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.country || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.city || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{Number(c.target_count).toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>{Number(c.sent_count ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>{Number(c.opened_count ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#16a34a", fontWeight: 600 }}>{(c.open_rate ?? 0).toFixed(1)}%</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>{Number(c.clicked_count ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#2563eb", fontWeight: 600 }}>{(c.click_rate ?? 0).toFixed(1)}%</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: statusStyle.bg,
                            color: statusStyle.fg,
                          }}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            onClick={() => handleTestSend(c.campaign_id)}
                            disabled={isSendingAny}
                            style={{
                              padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
                              background: "#fff", fontSize: 12, cursor: isSendingAny ? "not-allowed" : "pointer",
                              opacity: isSendingAny ? 0.5 : 1,
                            }}
                          >
                            {isSendingThis
                              ? "Sending..."
                              : c.status === "DRAFT"
                                ? "🧪 Test"
                                : "📧 REAL SEND"}
                          </button>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(c.created_at).toLocaleDateString("ko-KR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination — 현재 페이지 기준 최대 5개 번호만 표시 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCampaigns)} of {totalCampaigns} campaigns
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={pageBtnStyle(page <= 1)}
                >
                  &lt; Prev
                </button>

                {pageWindow[0] > 1 && (
                  <>
                    <button onClick={() => setPage(1)} style={pageBtnStyle(false)}>1</button>
                    {pageWindow[0] > 2 && (
                      <span style={{ fontSize: 12, color: "#9ca3af", padding: "0 2px" }}>…</span>
                    )}
                  </>
                )}

                {pageWindow.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      ...pageBtnStyle(false),
                      background: p === page ? "#111" : "#fff",
                      color: p === page ? "#fff" : "#111",
                    }}
                  >
                    {p}
                  </button>
                ))}

                {pageWindow[pageWindow.length - 1] < totalPages && (
                  <>
                    {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
                      <span style={{ fontSize: 12, color: "#9ca3af", padding: "0 2px" }}>…</span>
                    )}
                    <button onClick={() => setPage(totalPages)} style={pageBtnStyle(false)}>
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={pageBtnStyle(page >= totalPages)}
                >
                  Next &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#fff",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#fff",
  fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
});