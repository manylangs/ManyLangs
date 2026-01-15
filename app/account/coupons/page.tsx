"use client";

import { useEffect, useState } from "react";

type Coupon = {
  code: string;
  status: "Unused" | "Activated";
  issuedAt?: number; // legacy coupon 대응
};

export default function MyCouponsPage() {
  const userId = "test_user_123"; // TODO: Clerk 연동
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/coupons/my?userId=${userId}`)
      .then(res => res.json())
      .then(data => setCoupons(data.coupons ?? []));
  }, []);

  function copyCoupon(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>My Coupons</h1>

      {/* 🔔 상단 고정 안내 */}
      <p style={{ marginTop: 12, color: "#555" }}>
        Tap a coupon to copy the code.
      </p>

      {coupons.length === 0 && <p>No coupons available.</p>}

      <ul style={{ marginTop: 16, padding: 0, listStyle: "none" }}>
        {coupons.map(c => {
          const isCopied = copiedCode === c.code;

          return (
            <li
              key={c.code}
              onClick={() => copyCoupon(c.code)}
              style={{
                marginBottom: 12,
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 6,
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <strong>{c.code}</strong>

              <div style={{ marginTop: 4 }}>
                Status:{" "}
                {c.status === "Unused"
                  ? "Unused"
                  : "Used"}
              </div>

              {/* ✅ 터치(복사)했을 때만 보이는 핵심 문구 */}
              {c.status === "Unused" && isCopied && (
                <div style={{ marginTop: 6, fontSize: 13, color: "#333" }}>
                  Enter this coupon code when selecting a textbook to get
                  30 days of access.
                </div>
              )}

              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                Issued:{" "}
                {c.issuedAt
                  ? new Date(c.issuedAt).toLocaleDateString()
                  : "—"}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
