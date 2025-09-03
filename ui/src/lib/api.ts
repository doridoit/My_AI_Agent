const BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function chat(user_query: string) {
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_query }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadCsv(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/upload/csv`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadPdf(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/upload/pdf`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function toCSV(headers: string[], rows: Record<string, any>[]): string {
  const head = headers.join(",");
  const body = rows
    .map((row) => headers.map((h) => String(row[h] ?? "").replaceAll(",", " ")).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export async function edaProfileFromParsed(uploadedData: any, maxPcaPoints = 800) {
  if (!uploadedData?.headers || !uploadedData?.rows) throw new Error("invalid uploaded data");
  const csv = toCSV(uploadedData.headers, uploadedData.rows);
  const b64 = btoa(unescape(encodeURIComponent(csv)));
  const r = await fetch(`${BASE}/api/eda/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv_b64: b64, max_pca_points: maxPcaPoints }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function ragSearch(query: string) {
  const r = await fetch(`${BASE}/api/rag/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

