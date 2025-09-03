"use client";
import React, { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000";

export default function RagPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSearch() {
    setLoading(true);
    setHits([]);
    try {
      const r = await fetch(`${API}/api/rag/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, rag_index_exists: false }),
      });
      const data = await r.json();
      setHits(data?.hits || []);
    } catch (e) {
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>RAG</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어를 입력" style={{ flex: 1, padding: 8 }} />
        <button onClick={onSearch} disabled={loading}>{loading ? "검색 중..." : "검색"}</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {hits.map((h, i) => (
          <div key={i} style={{ padding: 8, border: "1px solid #eee", marginBottom: 8 }}>
            {(h.text || "").slice(0, 400)}{(h.text || "").length > 400 ? "…" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
