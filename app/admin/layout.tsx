"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [crmOpen, setCrmOpen] = useState(
    pathname.startsWith("/admin/imports") ||
    pathname.startsWith("/admin/leads") ||
    pathname.startsWith("/admin/tracking") ||
    pathname.startsWith("/admin/funnel") ||
    pathname.startsWith("/admin/exports")
  )

  const navStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    borderBottom: "1px solid #eee",
    flexWrap: "wrap",
    background: "#fff",
  }

  const linkStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    background: active ? "#111" : "transparent",
    color: active ? "#fff" : "#444",
    textDecoration: "none",
    border: "1px solid",
    borderColor: active ? "#111" : "#ddd",
    cursor: "pointer",
  })

  const dropdownBtnStyle: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: crmOpen ? 600 : 400,
    background: crmOpen ? "#111" : "transparent",
    color: crmOpen ? "#fff" : "#444",
    border: "1px solid",
    borderColor: crmOpen ? "#111" : "#ddd",
    cursor: "pointer",
  }

  const subLinkStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    borderRadius: 6,
    fontSize: 12,
    background: active ? "#333" : "#f5f5f5",
    color: active ? "#fff" : "#555",
    textDecoration: "none",
    border: "1px solid",
    borderColor: active ? "#333" : "#e0e0e0",
  })

  return (
    <div>
      <nav style={navStyle}>
        <Link href="/admin" style={linkStyle(pathname === "/admin")}>Dashboard</Link>
        <Link href="/admin/revenue" style={linkStyle(pathname.startsWith("/admin/revenue"))}>Revenue</Link>
        <Link href="/admin/logs" style={linkStyle(pathname.startsWith("/admin/logs"))}>Logs</Link>
        <Link href="/admin/active" style={linkStyle(pathname.startsWith("/admin/active"))}>Active</Link>
        <Link href="/admin/promo" style={linkStyle(pathname.startsWith("/admin/promo"))}>Promo</Link>

        <div style={{ position: "relative" }}>
          <button style={dropdownBtnStyle} onClick={() => setCrmOpen(!crmOpen)}>
            CRM {crmOpen ? "▲" : "▼"}
          </button>
        </div>

        {crmOpen && (
          <>
            <Link href="/admin/imports" style={subLinkStyle(pathname.startsWith("/admin/imports"))}>📥 Imports</Link>
            <Link href="/admin/leads" style={subLinkStyle(pathname.startsWith("/admin/leads"))}>🎯 Leads</Link>
            <Link href="/admin/funnel" style={subLinkStyle(pathname.startsWith("/admin/funnel"))}>📈 Funnel</Link>
            <Link href="/admin/exports" style={subLinkStyle(pathname.startsWith("/admin/exports"))}>💾 Exports</Link>
            <Link href="/admin/tracking" style={subLinkStyle(pathname.startsWith("/admin/tracking"))}>📊 Tracking</Link>
            <Link href="/admin/youtube" style={subLinkStyle(pathname.startsWith("/admin/youtube"))}>🎥 YouTube</Link>
          </>
        )}
      </nav>
      <main>{children}</main>
    </div>
  )
}