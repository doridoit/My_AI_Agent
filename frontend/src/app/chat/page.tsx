"use client";
import React, { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000";

export default function ChatPage() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAnswer(null);
    try {
      const r = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_query: q, rag_index_exists: false }),
      });
      const data = await r.json();
      setAnswer(data?.answer ?? JSON.stringify(data));
    } catch (e: any) {
      setAnswer(String(e));
    } finally {
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
    </div>
  );
}

