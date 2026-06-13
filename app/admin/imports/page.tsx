"use client"

import { useEffect, useState, useRef } from "react"

type Batch = {
  id: number
  batch_id: string
  source: string
  filename: string
  total_rows: number
  imported_rows: number
  created_at: string
}

export default function ImportsPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/admin/crm/imports")
      const json = await res.json()
      setBatches(json.batches || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBatches() }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setMessage("CSV 파일을 선택하세요"); return }

    setUploading(true)
    setMessage("")

    const form = new FormData()
    form.append("file", file)

    try {
      const res = await fetch("/api/admin/crm/imports", {
        method: "POST",
        body: form,
      })
      const json = await res.json()
      setMessage(`✅ imported: ${json.imported} / total: ${json.total}`)
      fetchBatches()
    } catch (e) {
      setMessage("❌ Upload 실패")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>📥 Import History</h1>

      {/* 업로드 영역 */}
      <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, marginBottom: 24, maxWidth: 480 }}>
        <div style={{ fontSize: 13, marginBottom: 10, color: "#555" }}>Apollo CSV 업로드</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ fontSize: 13 }} />
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              padding: "6px 16px", borderRadius: 6, fontSize: 13,
              background: "#111", color: "#fff", border: "none", cursor: "pointer"
            }}
          >
            {uploading ? "Importing..." : "Import"}
          </button>
        </div>
        {message && <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>{message}</div>}
      </div>

      {/* 이력 테이블 */}
      {loading ? <div>Loading...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {["Source", "Filename", "Total", "Imported", "Date"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 16, color: "#999" }}>No import history</td></tr>
            ) : batches.map(b => (
              <tr key={b.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "8px 12px" }}><span style={{ background: "#e8f4e8", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{b.source}</span></td>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{b.filename}</td>
                <td style={{ padding: "8px 12px" }}>{b.total_rows}</td>
                <td style={{ padding: "8px 12px", color: "#22c55e", fontWeight: 600 }}>{b.imported_rows}</td>
                <td style={{ padding: "8px 12px", color: "#888" }}>{b.created_at?.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
