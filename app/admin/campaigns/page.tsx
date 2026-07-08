"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Campaign {
  id: number;
  campaign_id: string;
  subject: string;
  body?: string;
  country?: string;
  city?: string;
  status: string;
  target_count: number;
  created_at: string;
  send_runs?: number;
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

  const [countries, setCountries] = useState<string[]>([]);

  // ── History / KPI scope ──────────────────────────────
  const [historyCountry, setHistoryCountry] = useState(ALL_VALUE);
  const [historyCity, setHistoryCity] = useState(ALL_VALUE);
  const [historyCities, setHistoryCities] = useState<string[]>([]);

  // ── 검색어 (subject / campaign_id) ──────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // ── Create Campaign scope ───────────────────────────────
  const [formCountry, setFormCountry] = useState(ALL_VALUE);
  const [formCity, setFormCity] = useState(ALL_VALUE);
  const [formCities, setFormCities] = useState<string[]>([]);

  // Form state
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Edit Campaign
  const [editingCampaign, setEditingCampaign] =
    useState<Campaign | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

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
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── 캠페인 다중 선택 (체크박스) ──────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── row 단위 개별 Reset (Campaign → DRAFT, Lead → NEW) ──
  const [rowResetting, setRowResetting] = useState<string | null>(null);

  // ── row 단위 개별 Delete (campaigns + email_tracking만 삭제, schools는 유지) ──
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── 선택 캠페인 일괄 액션 ────────────────────────────
  const [bulkResetting, setBulkResetting] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] =
    useState<{ done: number; total: number } | null>(null);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  // ── 파일 업로드로 한 번에 등록 + 캠페인 생성 ──────────────────────────
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const [fileSubject, setFileSubject] = useState("");
  const [fileBody, setFileBody] = useState("");
  const [fileSubmitting, setFileSubmitting] = useState(false);
  const [fileMsg, setFileMsg] =
    useState<{ ok: boolean; text: string } | null>(null);

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
        fetchCampaigns(historyCountry, historyCity, 1, search);
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
    targetPage: number = page,
    targetSearch: string = search
  ) => {
    try {
      const params = new URLSearchParams();

      if (targetCountry !== ALL_VALUE) params.set("country", targetCountry);
      if (targetCity !== ALL_VALUE) params.set("city", targetCity);
      if (targetSearch.trim()) params.set("q", targetSearch.trim());
      params.set("page", String(targetPage));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(
        `/api/admin/crm/campaigns?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setCampaigns(data.campaigns ?? []);
      setTotalCampaigns(data.pagination?.total ?? 0);

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

  useEffect(() => {
    setPage(1);
    fetchCampaigns(historyCountry, historyCity, 1, search);
    fetchCities(historyCountry, setHistoryCities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyCountry]);

  useEffect(() => {
    setPage(1);
    fetchCampaigns(historyCountry, historyCity, 1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyCity]);

  useEffect(() => {
    fetchCities(formCountry, setFormCities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCountry]);

  useEffect(() => {
    fetchCampaigns(historyCountry, historyCity, page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    setSelectedIds(new Set());
    fetchCampaigns(historyCountry, historyCity, 1, searchInput);
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
    fetchCampaigns(historyCountry, historyCity, 1, "");
  };

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
        fetchCampaigns(historyCountry, historyCity, 1, search);
      } else {
        setCreateMsg(`❌ ${data.error}`);
      }
    } catch (e: any) {
      setCreateMsg(`❌ ${e.message}`);
    } finally {
      setCreating(false);
    }
  };
  const handleSaveCampaign = async () => {
    if (!editingCampaign) return;

    const res = await fetch("/api/admin/crm/campaigns", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign_id: editingCampaign.campaign_id,
        subject: editSubject,
        body: editBody,
      }),
    });

    if (!res.ok) {
      alert("Campaign 저장 실패");
      return;
    }

    setEditingCampaign(null);
    setEditSubject("");
    setEditBody("");

    fetchCampaigns();
  };

  // ── Send (DRAFT/READY 구분 없이 단일 발송 버튼) ──────
  const handleSend = async (campaign_id: string) => {
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

      await fetchCampaigns(historyCountry, historyCity, page, search);
    } catch (e: any) {
      setSendResult({ success: false, mode: "SEND", campaign_id, target_count: 0, sample: [], message: "", error: e.message });
    } finally {
      setSendingId(null);
    }
  };

  const handleReset = async () => {
    if (!confirm("현재 선택한 범위(Country/City)의 SENT를 READY로 되돌리시겠습니까?\n※ 특정 캠페인만 되돌리려면 아래 표에서 개별 Reset 또는 체크박스로 선택 후 일괄 Reset을 사용하세요.")) return;

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

      await fetchCampaigns(historyCountry, historyCity, page, search);

      if (hasChecked) {
        await handleCheckTarget();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── row 단위 Reset: 단일 호출로 Campaign → DRAFT, Lead → NEW 모두 수행 ──
  // ※ /api/admin/crm/campaigns/reset 엔드포인트가 campaign_ids를 받으면
  //    해당 캠페인의 status를 DRAFT로, sent_count/latest_opened/latest_clicked를
  //    0으로, 대상 lead를 NEW로 되돌리도록 백엔드가 맞춰져 있어야 합니다.
  //    (send_runs는 건드리지 않고 그대로 유지)
  const handleRowReset = async (campaign_id: string) => {
    if (
      !confirm(
        `캠페인 [${campaign_id}]을 Reset 하시겠습니까?\n(발송 대상 → NEW, Campaign → DRAFT)`
      )
    ) {
      return;
    }

    setRowResetting(campaign_id);

    try {
      const res = await fetch("/api/admin/crm/campaigns/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_ids: [campaign_id],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Reset 실패");
      }

      alert(`✅ Reset 완료 (${data.updated}건)`);

      await fetchCampaigns(historyCountry, historyCity, page, search);

      if (hasChecked) {
        await handleCheckTarget();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRowResetting(null);
    }
  };

  // ── Delete: campaigns + email_tracking만 삭제 (schools는 절대 건드리지 않음) ──
  const handleDeleteCampaign = async (campaign_id: string) => {
    if (
      !confirm(
        "Delete Campaign?\n\nCampaign history and tracking data will be permanently deleted.\n\nLead database (schools) will NOT be affected."
      )
    ) {
      return;
    }

    setDeletingId(campaign_id);

    try {
      const res = await fetch("/api/admin/crm/campaigns/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete 실패");
      }

      // 선택되어 있었다면 선택 목록에서도 제거
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(campaign_id);
        return next;
      });

      await fetchCampaigns(historyCountry, historyCity, page, search);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── 체크박스 선택 토글 ──────────────────────────────
  const toggleRowSelect = (campaign_id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(campaign_id)) next.delete(campaign_id);
      else next.add(campaign_id);
      return next;
    });
  };

  const allOnPageSelected =
    campaigns.length > 0 && campaigns.every((c) => selectedIds.has(c.campaign_id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        campaigns.forEach((c) => next.delete(c.campaign_id));
      } else {
        campaigns.forEach((c) => next.add(c.campaign_id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── 선택 캠페인 일괄 Reset: 단일 호출로 Campaign → DRAFT, Lead → NEW 모두 수행 ──
  const handleBulkReset = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}개 캠페인을 Reset 하시겠습니까?\n(발송 대상 → NEW, Campaign → DRAFT)`)) return;

    setBulkResetting(true);
    setBulkMsg(null);
    try {
      const res = await fetch("/api/admin/crm/campaigns/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_ids: ids }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Reset 실패");
      }

      setBulkMsg(`✅ ${ids.length}개 캠페인 Reset 완료 (${data.updated}건)`);

      await fetchCampaigns(historyCountry, historyCity, page, search);
      if (hasChecked) await handleCheckTarget();
      clearSelection();
    } catch (e: any) {
      setBulkMsg(`❌ ${e.message}`);
    } finally {
      setBulkResetting(false);
    }
  };

  // ── 선택 캠페인 일괄 재발송 (순차) ──────────────────
  const handleBulkSend = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}개 캠페인을 순서대로 발송하시겠습니까?\n(캠페인별로 실제 발송이 각각 실행됩니다)`)) return;

    setBulkSending(true);
    setBulkMsg(null);
    setBulkProgress({ done: 0, total: ids.length });

    let successCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const res = await fetch("/api/admin/crm/campaigns/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_id: id }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error("BULK SEND FAILED:", id, e);
      }
      setBulkProgress({ done: i + 1, total: ids.length });
    }

    setBulkMsg(`✅ ${successCount}/${ids.length}개 캠페인 발송 완료`);
    setBulkSending(false);
    setBulkProgress(null);

    await fetchCampaigns(historyCountry, historyCity, page, search);
    if (hasChecked) await handleCheckTarget();
    clearSelection();
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
        SES 연결 완료. Send는 실제 이메일을 발송합니다.
      </p>

      {/* History scope selector */}
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
          ↩ Reset SENT (전체 범위)
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

      {/* Create Campaign Form */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
          {editingCampaign
            ? `✏️ Campaign 수정 (${editingCampaign.campaign_id})`
            : "새 Campaign 생성"}
        </h2>

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
            value={editingCampaign ? editSubject : subject}
            onChange={(e) =>
              editingCampaign
                ? setEditSubject(e.target.value)
                : setSubject(e.target.value)
            }
            placeholder="예: ManyLangs Partner Invitation"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </label>

        <label style={{ ...labelStyle, display: "block", marginBottom: 20 }}>
          Email Body
          <textarea
            value={editingCampaign ? editBody : emailBody}
            onChange={(e) =>
              editingCampaign
                ? setEditBody(e.target.value)
                : setEmailBody(e.target.value)
            }
            rows={6}
            placeholder={"안녕하세요,\n\nManyLangs 파트너십 제안드립니다...\n\n감사합니다."}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>

          {editingCampaign ? (
            <>
              <button
                onClick={handleSaveCampaign}
                style={btnPrimary}
              >
                💾 Save
              </button>

              <button
                onClick={() => {
                  setEditingCampaign(null);
                  setEditSubject("");
                  setEditBody("");
                }}
                style={{
                  ...btnPrimary,
                  background: "#6b7280",
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              style={btnPrimary}
            >
              {creating ? "생성 중..." : "✅ Campaign 생성"}
            </button>
          )}

          {createMsg && (
            <span
              style={{
                fontSize: 13,
                color: createMsg.startsWith("✅")
                  ? "#16a34a"
                  : "#dc2626",
              }}
            >
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Campaign History</h2>

          {/* 검색어 (subject / campaign_id) */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="🔍 Subject / Campaign ID 검색"
              style={{ ...inputStyle, width: 260 }}
            />
            <button onClick={handleSearch} style={{ ...pageBtnStyle(false), padding: "8px 14px" }}>
              검색
            </button>
            {search && (
              <button onClick={handleClearSearch} style={{ ...pageBtnStyle(false), padding: "8px 14px" }}>
                ✕ 초기화
              </button>
            )}
          </div>
        </div>

        {search && (
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            검색어 "<strong>{search}</strong>" 결과 — {totalCampaigns}건
          </div>
        )}

        {/* 선택된 캠페인 일괄 액션 바 */}
        {selectedIds.size > 0 && (
          <div style={{
            display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            border: "1px solid #c7d2fe", background: "#eef2ff", borderRadius: 10,
            padding: "12px 16px", marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#3730a3" }}>
              {selectedIds.size}개 캠페인 선택됨
            </span>

            <button
              onClick={handleBulkReset}
              disabled={bulkResetting || bulkSending}
              style={{ ...pageBtnStyle(false), background: "#dc2626", color: "#fff", border: "none" }}
            >
              {bulkResetting ? "복구 중..." : "↩ 선택 Reset"}
            </button>

            <button
              onClick={handleBulkSend}
              disabled={bulkResetting || bulkSending}
              style={{ ...pageBtnStyle(false), background: "#111", color: "#fff", border: "none" }}
            >
              {bulkSending
                ? `발송 중... (${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? selectedIds.size})`
                : "📧 선택 순차 발송"}
            </button>

            <button
              onClick={clearSelection}
              disabled={bulkResetting || bulkSending}
              style={pageBtnStyle(false)}
            >
              선택 해제
            </button>

            {bulkMsg && (
              <span style={{ fontSize: 12, color: bulkMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                {bulkMsg}
              </span>
            )}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>조건에 맞는 Campaign이 없습니다.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "10px 14px" }}>
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                      />
                    </th>
                    {[
                      "Campaign ID",
                      "Subject",
                      "Country",
                      "City",
                      "대상 수",
                      "Runs",
                      "Sent",
                      "Opened",
                      "Open %",
                      "Clicked",
                      "Click %",
                      "Status",
                      "Action",
                      "생성일",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const isSendingThis = sendingId === c.campaign_id;
                    const isSendingAny = sendingId !== null;
                    const isResettingThis = rowResetting === c.campaign_id;
                    const isDeletingThis = deletingId === c.campaign_id;
                    const isSelected = selectedIds.has(c.campaign_id);

                    const statusColors: Record<string, { bg: string; fg: string }> = {
                      DRAFT: { bg: "#f3f4f6", fg: "#6b7280" },
                      READY: { bg: "#dcfce7", fg: "#16a34a" },
                      SENDING: { bg: "#fef9c3", fg: "#ca8a04" },
                      SENT: { bg: "#dbeafe", fg: "#2563eb" },
                    };
                    const statusStyle = statusColors[c.status] ?? statusColors.DRAFT;

                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0", background: isSelected ? "#f5f7ff" : "transparent" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelect(c.campaign_id)}
                          />
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{c.campaign_id}</td>
                        <td style={{ padding: "10px 14px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</td>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.country || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.city || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{Number(c.target_count).toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          {c.send_runs !== undefined ? Number(c.send_runs).toLocaleString() : "—"}
                        </td>
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
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          {c.status === "SENDING" ? (
                            <span style={{ fontSize: 12, color: "#ca8a04" }}>Sending...</span>
                          ) : c.status === "SENT" ? (
                            <>
                              <button
                                onClick={() => handleRowReset(c.campaign_id)}
                                disabled={isResettingThis || isDeletingThis}
                                style={{
                                  padding: "4px 12px", borderRadius: 6, border: "1px solid #fca5a5",
                                  background: "#fff", color: "#dc2626", fontSize: 12,
                                  marginRight: 6,
                                  cursor: isResettingThis || isDeletingThis ? "not-allowed" : "pointer",
                                  opacity: isResettingThis || isDeletingThis ? 0.5 : 1,
                                }}
                              >
                                {isResettingThis ? "처리 중..." : "↩ Reset"}
                              </button>

                              <button
                                onClick={() => handleDeleteCampaign(c.campaign_id)}
                                disabled={isResettingThis || isDeletingThis}
                                style={{
                                  padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
                                  background: "#fff", color: "#6b7280", fontSize: 12,
                                  cursor: isResettingThis || isDeletingThis ? "not-allowed" : "pointer",
                                  opacity: isResettingThis || isDeletingThis ? 0.5 : 1,
                                }}
                              >
                                {isDeletingThis ? "삭제 중..." : "🗑 Delete"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCampaign(c);
                                  setEditSubject(c.subject);
                                  setEditBody(c.body ?? "");
                                }}
                                style={{
                                  padding: "4px 10px",
                                  marginRight: 6,
                                  borderRadius: 6,
                                  border: "1px solid #d1d5db",
                                  background: "#fff",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                onClick={() => handleSend(c.campaign_id)}
                                disabled={isSendingAny || isDeletingThis}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: 6,
                                  border: "1px solid #d1d5db",
                                  background: "#fff",
                                  fontSize: 12,
                                  marginRight: 6,
                                  cursor: isSendingAny || isDeletingThis ? "not-allowed" : "pointer",
                                  opacity: isSendingAny || isDeletingThis ? 0.5 : 1,
                                }}
                              >
                                {isSendingThis ? "Sending..." : "📧 Send"}
                              </button>

                              <button
                                onClick={() => handleDeleteCampaign(c.campaign_id)}
                                disabled={isSendingAny || isDeletingThis}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: 6,
                                  border: "1px solid #d1d5db",
                                  background: "#fff",
                                  color: "#6b7280",
                                  fontSize: 12,
                                  cursor: isSendingAny || isDeletingThis ? "not-allowed" : "pointer",
                                  opacity: isSendingAny || isDeletingThis ? 0.5 : 1,
                                }}
                              >
                                {isDeletingThis ? "삭제 중..." : "🗑 Delete"}
                              </button>
                            </>
                          )}
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

            {/* Pagination */}
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