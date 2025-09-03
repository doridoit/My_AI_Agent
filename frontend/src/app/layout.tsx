import React from "react";

export const metadata = {
  title: "AI Agent",
  description: "Frontend for AI Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "Inter, system-ui, Arial, sans-serif", margin: 0 }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
          <b>AI Agent</b>
          <span style={{ marginLeft: 12, color: "#777" }}>TS/Next.js Prototype</span>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}

