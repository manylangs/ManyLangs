"use client"

import { useEffect } from "react"

export default function AdminPage() {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/report", {
          headers: {
            "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL!,
          },
        })

        const data = await res.json()
        console.log("ADMIN DATA:", data)
      } catch (e) {
        console.error("Fetch error:", e)
      }
    }

    fetchData()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Page</h1>
    </div>
  )
}