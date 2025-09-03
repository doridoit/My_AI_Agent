import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h2>시작하기</h2>
      <ul>
        <li>
          <Link href="/chat">💬 Chat</Link>
        </li>
        <li>
          <Link href="/eda">📊 EDA</Link>
        </li>
        <li>
          <Link href="/rag">📚 RAG</Link>
        </li>
      </ul>
      <p style={{ color: "#666" }}>API: {process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}</p>
    </div>
  );
}

