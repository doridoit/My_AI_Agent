/// <reference types="vite/client" />
const BASE = import.meta.env.VITE_API_BASE_URL || "";

type ChatOpts = {
  uploadedData?: any;
  index_dir?: string | null;
  rag_index_exists?: boolean;
  eda_context?: string;
};

function toCSV(headers: string[], rows: Record<string, any>[]): string {
  const head = headers.join(",");
  const body = rows
    .map((row) => headers.map((h) => String(row[h] ?? "").replaceAll(",", " ")).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export async function chat(user_query: string, opts: ChatOpts = {}) {
  let csv_data_b64: string | undefined = undefined;
  if (opts.uploadedData?.headers && opts.uploadedData?.rows) {
    try {
      const csv = toCSV(opts.uploadedData.headers, opts.uploadedData.rows);
      csv_data_b64 = btoa(unescape(encodeURIComponent(csv)));
    } catch {}
  }
  const body: any = { user_query };
  if (csv_data_b64) body.csv_data_b64 = csv_data_b64;
  if (opts.index_dir) body.index_dir = opts.index_dir;
  if (typeof opts.rag_index_exists === "boolean") body.rag_index_exists = opts.rag_index_exists;
  if (opts.eda_context) body.eda_context = opts.eda_context;
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export async function ragIndex(files: File[]) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const r = await fetch(`${BASE}/api/rag/index`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
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

export async function ragSearch(query: string, opts: { index_dir?: string | null; rag_index_exists?: boolean } = {}) {
  const body: any = { query };
  if (opts.index_dir) body.index_dir = opts.index_dir;
  if (typeof opts.rag_index_exists === "boolean") body.rag_index_exists = opts.rag_index_exists;
  const r = await fetch(`${BASE}/api/rag/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
