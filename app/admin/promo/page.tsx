"use client";

import { useState } from "react";
import Link from "next/link";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
const PAGE_SIZE = 100;
const DAY_MS = 1000 * 60 * 60 * 24;

type PromoCoupon = {
  code: string;
  used: boolean;
  createdAtMs: number;
  activationDeadline: number;
  durationDays: number;
  usedBy?: string;
  usedAt?: number;
};

export default function AdminPromoPage() {
  const [count, setCount] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [fetched, setFetched] = useState(false);
  const [copied, setCopied] = useState(false);

  // 생성
  async function handleGenerate() {
    if (generating) return;

    setGenerating(true);
    setNewCodes([]);

    try {
      const res = await fetch("/api/admin/promo/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": ADMIN_EMAIL,
        },
        body: JSON.stringify({ count }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to generate");
        return;
      }

      setNewCodes(data.codes ?? []);

      await fetchCoupons();
    } catch (e) {
      alert("Network error");
    } finally {
      setGenerating(false);
    }
  }

  // 목록 조회
  async function fetchCoupons() {
    setLoading(true);
    setFetched(false);
    setPage(1);

    try {
      const res = await fetch("/api/admin/promo/list", {
        headers: {
          "x-admin-email": ADMIN_EMAIL,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setCoupons(data.coupons ?? []);
        setFetched(true);
      } else {
        alert(data.error || "Failed to fetch");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  // 전체 복사
  async function copyAll(list: string[]) {
    const text = list.join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");

      ta.value = text;

      document.body.appendChild(ta);

      ta.select();

      document.execCommand("copy");

      document.body.removeChild(ta);
    }

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }

  // TXT 다운로드
  function downloadCSV(list: PromoCoupon[]) {
    const now = new Date();

    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const generatedAt =
      `${now.getFullYear()}-` +
      `${mm}-${dd} ` +
      `${hh}:${min}:${ss}`;

    const content = list
      .map((c, index) => {
        return `
================================
PROMO COUPON ${index + 1}
================================

code: ${c.code}

used: ${c.used ? "used" : "unused"}

createdAt: ${new Date(
          c.createdAtMs
        ).toLocaleString("ko-KR")}

activationDeadline: ${new Date(
          c.activationDeadline
        ).toLocaleString("ko-KR")}

durationDays: ${c.durationDays} days

generatedAt: ${generatedAt}

================================
`;
      })
      .join("\n");

    const blob = new Blob([content], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =
      `promo-coupons-` +
      `${yy}${mm}${dd}-` +
      `${hh}${min}${ss}.txt`;

    a.click();

    URL.revokeObjectURL(url);
  }

  // 페이지네이션
  const totalPages = Math.ceil(coupons.length / PAGE_SIZE) || 1;

  const paginated = coupons.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const now = Date.now();

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 24,
        }}
      >
        Free Promo Coupons
      </h1>

      {/* 생성 영역 */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Generate Coupons
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <label
            style={{
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Count
          </label>

          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) =>
              setCount(Number(e.target.value))
            }
            style={{
              width: 80,
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: "8px 20px",
              background: generating
                ? "#9ca3af"
                : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: generating
                ? "not-allowed"
                : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {generating
              ? "Generating..."
              : "Generate"}
          </button>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginTop: 8,
          }}
        >
          Activation deadline: 7 days ·
          Usage period: 14 days ·
          Max 200 per batch
        </p>

        {/* 생성된 코드 */}
        {newCodes.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#16a34a",
                }}
              >
                ✓ Generated {newCodes.length} codes
              </span>

              <button
                onClick={() => copyAll(newCodes)}
                style={{
                  padding: "4px 12px",
                  fontSize: 13,
                  border: "1px solid #d1d5db",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: copied
                    ? "#dcfce7"
                    : "white",
                }}
              >
                {copied ? "Copied!" : "Copy All"}
              </button>

              <button
                onClick={() =>
                  downloadCSV(
                    newCodes.map((code) => ({
                      code,
                      used: false,
                      createdAtMs: now,
                      activationDeadline:
                        now +
                        7 * DAY_MS,
                      durationDays: 14,
                    }))
                  )
                }
                style={{
                  padding: "4px 12px",
                  fontSize: 13,
                  border: "1px solid #d1d5db",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: "white",
                }}
              >
                Export TXT
              </button>
            </div>

            <div
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: 12,
                maxHeight: 300,
                overflowY: "auto",
                lineHeight: 1.8,
              }}
            >
              {newCodes.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 전체 목록 */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Active Promo Coupons

            {fetched && (
              <span
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  marginLeft: 8,
                }}
              >
                ({coupons.length} total)
              </span>
            )}
          </h2>

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <button
              onClick={fetchCoupons}
              disabled={loading}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                border: "1px solid #d1d5db",
                borderRadius: 5,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                background: "white",
              }}
            >
              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

            {fetched &&
              coupons.length > 0 && (
                <button
                  onClick={() =>
                    downloadCSV(coupons)
                  }
                  style={{
                    padding: "6px 14px",
                    fontSize: 13,
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 5,
                    cursor: "pointer",
                    background: "white",
                  }}
                >
                  Export TXT
                </button>
              )}
          </div>
        </div>

        {!fetched && !loading && (
          <p
            style={{
              fontSize: 14,
              color: "#9ca3af",
            }}
          >
            Click Refresh to load coupons.
          </p>
        )}

        {fetched &&
          coupons.length === 0 && (
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
              }}
            >
              No active promo coupons.
            </p>
          )}

        {fetched &&
          coupons.length > 0 && (
            <>
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.max(1, p - 1)
                      )
                    }
                    disabled={page === 1}
                  >
                    ←
                  </button>

                  <span
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    Page {page} / {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          totalPages,
                          p + 1
                        )
                      )
                    }
                    disabled={
                      page === totalPages
                    }
                  >
                    →
                  </button>
                </div>
              )}

              <div
                style={{
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#f9fafb",
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      <th
                        style={{
                          padding:
                            "10px 16px",
                          textAlign: "left",
                        }}
                      >
                        Code
                      </th>

                      <th
                        style={{
                          padding:
                            "10px 16px",
                          textAlign: "left",
                        }}
                      >
                        Status
                      </th>

                      <th
                        style={{
                          padding:
                            "10px 16px",
                          textAlign: "left",
                        }}
                      >
                        Expires
                      </th>

                      <th
                        style={{
                          padding:
                            "10px 16px",
                          textAlign: "left",
                        }}
                      >
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginated.map(
                      (c, i) => {
                        const daysLeft =
                          Math.ceil(
                            (c.activationDeadline -
                              now) /
                              DAY_MS
                          );

                        return (
                          <tr
                            key={c.code}
                            style={{
                              borderTop:
                                i === 0
                                  ? "none"
                                  : "1px solid #f3f4f6",
                              fontSize: 13,
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "10px 16px",
                                fontFamily:
                                  "monospace",
                                fontWeight: 600,
                              }}
                            >
                              {c.code}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px 16px",
                              }}
                            >
                              {c.used ? (
                                <span>
                                  Used
                                </span>
                              ) : (
                                <span>
                                  Unused
                                </span>
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px 16px",
                              }}
                            >
                              {daysLeft}d left
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px 16px",
                              }}
                            >
                              {new Date(
                                c.createdAtMs
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
      </div>
    </div>
  );
}