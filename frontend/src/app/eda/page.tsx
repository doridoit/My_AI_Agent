"use client";
import React, { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000";

export default function EdaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function onRun() {
    if (!file) return;
    setLoading(true);
    setResp(null);
    try {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      const r = await fetch(`${API}/api/eda/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_b64: b64, max_pca_points: 800 }),
      });
      const data = await r.json();
      setResp(data);
    } catch (e) {
      setResp({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>EDA</h2>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={onRun} disabled={!file || loading} style={{ marginLeft: 8 }}>
        {loading ? "요약 중..." : "요약 실행"}
      </button>
      {resp && (
        <pre style={{ marginTop: 16, background: "#fafafa", padding: 12 }}>
{JSON.stringify(resp, null, 2)}
        </pre>
      )}
    </div>
  );
}

