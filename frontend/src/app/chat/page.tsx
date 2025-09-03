"use client";
import React, { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000";

export default function ChatPage() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useStream, setUseStream] = useState(true);
  const [pdfInfo, setPdfInfo] = useState<any>(null);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAnswer(null);
    try {
      if (useStream) {
        const es = new EventSource(`${API}/api/chat/stream?q=${encodeURIComponent(q)}`);
        let acc = "";
        es.onmessage = (ev) => {
          acc += ev.data;
          setAnswer(acc);
          es.close();
          setLoading(false);
        };
        es.onerror = () => {
          es.close();
          setLoading(false);
        };
      } else {
        const r = await fetch(`${API}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_query: q, rag_index_exists: false }),
        });
        const data = await r.json();
        setAnswer(data?.answer ?? JSON.stringify(data));
        setLoading(false);
      }
    } catch (e: any) {
      setAnswer(String(e));
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Chat</h2>
      <form onSubmit={onAsk} style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="질문을 입력하세요"
          style={{ flex: 1, padding: 8 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={useStream} onChange={(e) => setUseStream(e.target.checked)} />
          스트리밍
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "질의 중..." : "질의"}
        </button>
      </form>
      {answer && (
        <div style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          <b>응답</b>
          <div>{answer}</div>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <h4>PDF 업로드</h4>
        <input
          type="file"
          accept="application/pdf"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.append("file", f);
            const r = await fetch(`${API}/api/upload/pdf`, { method: "POST", body: fd });
            const data = await r.json();
            setPdfInfo(data);
          }}
        />
        {pdfInfo && <pre style={{ background: "#fafafa", padding: 8 }}>{JSON.stringify(pdfInfo, null, 2)}</pre>}
      </div>
    </div>
  );
}
