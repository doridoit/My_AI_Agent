# Ensure project root on sys.path for absolute imports
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from pydantic import BaseModel
import pandas as pd
import base64, io, time, requests

# --- FastAPI app ---
app = FastAPI(title="ai.agent.data_tools", description="Data tools server for EDA, uploads, and utilities.")

# --- CORS: allow all origins, methods, headers for dev ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DEV: allow all origins to eliminate CORS 403
    allow_credentials=False,
    allow_methods=["*"],  # allow all methods (GET/POST/OPTIONS/etc.)
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Preflight for any path
@app.options("/{rest_of_path:path}")
def _any_options(rest_of_path: str):
    return Response(status_code=204)

# --- Upload endpoints -------------------------------------------------------
@app.post("/upload/csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드 가능합니다.")
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV 파싱 실패: {e}")
    rows, cols = map(int, df.shape)
    preview = df.head(5).to_dict(orient="records")
    return {"ok": True, "filename": file.filename, "shape": {"rows": rows, "cols": cols}, "preview": preview}

@app.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
    content = await file.read()
    size = len(content)
    return {"ok": True, "filename": file.filename, "size_bytes": size}

# --- Tool-style endpoints ---------------------------------------------------
class EDAParams(BaseModel):
    csv_b64: str

@app.post("/tools/eda_summary")
def eda_summary(params: EDAParams):
    raw = base64.b64decode(params.csv_b64.encode())
    df = pd.read_csv(io.BytesIO(raw))
    n_rows, n_cols = df.shape
    nulls = df.isna().sum().to_dict()
    dtypes = df.dtypes.astype(str).to_dict()
    num_cols = df.select_dtypes(include=["number"]).columns[:30]
    corr = df[num_cols].corr().round(3).to_dict() if len(num_cols) > 1 else {}
    return {
        "shape": {"rows": int(n_rows), "cols": int(n_cols)},
        "nulls": nulls,
        "dtypes": dtypes,
        "corr(num<=30)": corr,
    }

class PingParams(BaseModel):
    url: str

@app.post("/tools/ping")
def ping(params: PingParams):
    t0 = time.time()
    try:
        r = requests.get(params.url, timeout=5)
        return {"status": r.status_code, "elapsed": round(time.time() - t0, 3)}
    except Exception as e:
        return {"error": str(e)}

# --- Health -----------------------------------------------------------------
@app.get("/health")
def health():
    return {"ok": True}

@app.head("/health")
def health_head():
    return Response(status_code=204)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)