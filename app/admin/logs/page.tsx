"use client"

// ===== [START] admin logs page =====
import { useEffect, useState } from "react"
import Link from "next/link"

type LogItem = {
  id: string
  type?: string
  userId?: string
  error?: string
  createdAt?: number
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  // 🔥 필터
  const [typeFilter, setTypeFilter] = useState("")
  const [searchUser, setSearchUser] = useState("")

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        setErrorMsg("")

        const res = await fetch("/api/admin/logs", {
          headers: {
            "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
          },
        })

        if (!res.ok) {
          throw new Error(`Failed to load logs: ${res.status}`)
        }

        const data = await res.json()
        setLogs(Array.isArray(data.logs) ? data.logs : [])
      } catch (e) {
        console.error(e)
        setErrorMsg("Failed to load logs")
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  // 🔥 필터 적용
  const filteredLogs = logs.filter((log) => {
    if (typeFilter && log.type !== typeFilter) return false
    if (searchUser && !log.userId?.includes(searchUser)) return false
    return true
  })

  // 🔥 통계 계산
  const totalCount = logs.length

  const typeStats = {
    admin: logs.filter(l => l.type === "admin_api_error").length,
    checkout: logs.filter(l => l.type === "checkout_error").length,
    refund: logs.filter(l => l.type === "refund_error").length,
  }

  // ==============================
  // 🔥 [추가 1] 시간별 그래프 데이터 생성
  // ==============================
  const dailyMap: Record<string, number> = {}

  logs.forEach((log) => {
    if (!log.createdAt) return
    const d = new Date(log.createdAt)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    dailyMap[key] = (dailyMap[key] || 0) + 1
  })

  const graphData = Object.entries(dailyMap)

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>
  }

  if (errorMsg) {
    return <div style={{ padding: 20 }}>{errorMsg}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      {/* 🔥 상단 버튼 */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>📚← Back to Library</button>
        </Link>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Error Logs</h1>

      {/* ============================== */}
      {/* 🔥 [추가 2] 그래프 UI */}
      {/* ============================== */}
      <div style={{ marginBottom: 20 }}>
        <div><b>📈 Daily Error Trend</b></div>
        {graphData.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888" }}>No data</div>
        ) : (
          graphData.map(([day, count]) => (
            <div key={day}>
              {day} : {"█".repeat(count)} ({count})
            </div>
          ))
        )}
      </div>

      {/* 🔥 통계 대시보드 */}
      <div style={{ marginBottom: 20 }}>
        <div><b>Total Logs:</b> {totalCount}</div>
        <div>Admin: {typeStats.admin}</div>
        <div>Checkout: {typeStats.checkout}</div>
        <div>Refund: {typeStats.refund}</div>
      </div>

      {/* 🔥 필터 UI */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Search userId"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          style={{ marginRight: 10 }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="admin_api_error">Admin</option>
          <option value="checkout_error">Checkout</option>
          <option value="refund_error">Refund</option>
        </select>
      </div>

      {/* 🔥 로그 리스트 */}
      {filteredLogs.length === 0 ? (
        <div>No logs found.</div>
      ) : (
        filteredLogs.map((log) => (
          <div
            key={log.id}
            style={{
              border: "1px solid #ddd",
              padding: 10,
              marginBottom: 10,
              borderRadius: 6,
            }}
          >
            <div><b>Type:</b> {log.type || "-"}</div>
            <div><b>User:</b> {log.userId || "-"}</div>
            <div><b>Error:</b> {log.error || "-"}</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {log.createdAt
                ? new Date(log.createdAt).toLocaleString()
                : "-"}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
// ===== [END] admin logs page =====