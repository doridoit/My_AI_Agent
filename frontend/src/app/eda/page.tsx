"use client";
import React, { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000";

export default function EdaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<any>(null);

  function toBase64ViaDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("file read error"));
      reader.onload = () => {
        const res = String(reader.result || "");
        const idx = res.indexOf("base64,");
        resolve(idx >= 0 ? res.slice(idx + 7) : res);
      };
      reader.readAsDataURL(file);
    });
  }

  async function onRun() {
    if (!file) return;
    setLoading(true);
    setResp(null);
    try {
      const b64 = await toBase64ViaDataURL(file);
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
      <button
        onClick={async () => {
          if (!file) return;
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch(`${API}/api/upload/csv`, { method: "POST", body: fd });
          const data = await r.json();
          setUploadedInfo(data);
        }}
        disabled={!file}
        style={{ marginLeft: 8 }}
      >
        서버 업로드
      </button>
      {uploadedInfo && (
        <pre style={{ marginTop: 12, background: "#fafafa", padding: 8 }}>{JSON.stringify(uploadedInfo, null, 2)}</pre>
      )}
      {resp && <Charts resp={resp} />}
    </div>
  );
}

import ReactECharts from "echarts-for-react";

function Charts({ resp }: { resp: any }) {
  const nulls = resp?.nulls || {};
  const missEntries = Object.entries(nulls).filter(([_, v]) => Number(v) > 0) as [string, number][];
  const missSorted = missEntries.sort((a, b) => b[1] - a[1]).slice(0, 20);

  const numeric = resp?.numeric_stats || {};
  const cols = Object.keys(numeric);
  const means = cols.map((c) => Number(numeric[c]?.mean || 0));
  const medians = cols.map((c) => Number(numeric[c]?.median || 0));
  const pca = resp?.pca2d;

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
      <div>
        <h4>결측치 (상위 20)</h4>
        <ReactECharts
          style={{ height: 320 }}
          option={{
            tooltip: {},
            grid: { left: 140, right: 20 },
            xAxis: { type: "value" },
            yAxis: { type: "category", data: missSorted.map((x) => x[0]) },
            series: [{ type: "bar", data: missSorted.map((x) => x[1]) }],
          }}
        />
      </div>
      <div>
        <h4>평균 vs 중앙값</h4>
        <ReactECharts
          style={{ height: 360 }}
          option={{
            tooltip: {},
            legend: { data: ["mean", "median"] },
            grid: { left: 60, right: 20, bottom: 80 },
            xAxis: { type: "category", data: cols },
            yAxis: { type: "value" },
            series: [
              { name: "mean", type: "bar", data: means },
              { name: "median", type: "bar", data: medians },
            ],
          }}
        />
      </div>
      {pca && pca.x && (
        <div>
          <h4>PCA 2D</h4>
          <ReactECharts
            style={{ height: 420 }}
            option={{
              tooltip: {},
              xAxis: {},
              yAxis: {},
              series: [
                {
                  type: "scatter",
                  symbolSize: 6,
                  data: pca.x.map((x: number, i: number) => [x, pca.y[i]]),
                },
              ],
            }}
          />
        </div>
      )}
    </div>
  );
}
