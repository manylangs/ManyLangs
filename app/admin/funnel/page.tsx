"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface FunnelData {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  blocked: number;
  bySource: { source: string; count: number }[];
  recentBatches: { batch_id: string; filename: string; total_rows: number; imported_rows: number; created_at: string }[];
}

export default function FunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/crm/funnel")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!data) return <div className="p-8 text-red-500">Failed to load funnel data.</div>;

  const pct = (n: number) => data.total ? ((n / data.total) * 100).toFixed(1) : "0.0";

  const cards = [
    { label: "Total Leads", value: data.total, color: "bg-gray-800" },
    { label: "HOT", value: data.hot, color: "bg-red-600" },
    { label: "WARM", value: data.warm, color: "bg-orange-500" },
    { label: "COLD", value: data.cold, color: "bg-blue-600" },
    { label: "BLOCKED", value: data.blocked, color: "bg-gray-500" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Funnel Analytics</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${c.color} text-white rounded-xl p-5 text-center`}>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm mt-1 opacity-80">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Status Breakdown</h2>
        <div className="space-y-2">
          {[
            { label: "HOT", value: data.hot, color: "bg-red-500" },
            { label: "WARM", value: data.warm, color: "bg-orange-400" },
            { label: "COLD", value: data.cold, color: "bg-blue-500" },
            { label: "BLOCKED", value: data.blocked, color: "bg-gray-400" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-20 text-sm font-medium">{s.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4">
                <div className={`${s.color} h-4 rounded-full`} style={{ width: `${pct(s.value)}%` }} />
              </div>
              <span className="w-16 text-sm text-right">{s.value} ({pct(s.value)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Source Breakdown</h2>
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr><th className="p-3 text-left">Source</th><th className="p-3 text-right">Count</th></tr>
          </thead>
          <tbody>
            {data.bySource.map((s: any) => (
              <tr key={s.source} className="border-t">
                <td className="p-3">{s.source}</td>
                <td className="p-3 text-right font-mono">{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Batches */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Import Batches</h2>
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Batch ID</th>
              <th className="p-3 text-left">File</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Imported</th>
              <th className="p-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.recentBatches.map((b: any) => (
              <tr key={b.batch_id} className="border-t">
                <td className="p-3 font-mono text-xs">{b.batch_id}</td>
                <td className="p-3">{b.filename}</td>
                <td className="p-3 text-right">{b.total_rows}</td>
                <td className="p-3 text-right">{b.imported_rows}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(b.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}