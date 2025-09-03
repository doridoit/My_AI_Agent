import os
import time
from typing import Optional

import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


CORE_URL = os.getenv("CORE_LOGIC_SERVER_URL", "http://localhost:8001")
DATA_URL = os.getenv("DATA_TOOLS_SERVER_URL", "http://localhost:8002")

app = FastAPI(title="AI Agent API Gateway", description="Front-end API gateway that proxies to MCP servers.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatBody(BaseModel):
    user_query: str
    csv_data_b64: Optional[str] = None
    rag_index_exists: bool = False
    index_dir: Optional[str] = None
    eda_context: Optional[str] = None


class EDAProfileBody(BaseModel):
    csv_b64: str
    max_pca_points: int = 1500


@app.get("/api/health")
async def health():
    async with httpx.AsyncClient(timeout=2.0) as client:
        t0 = time.time()
        core_ok = False
        data_ok = False
        try:
            r1 = await client.get(f"{CORE_URL}/health")
            core_ok = r1.status_code == 200 and bool(r1.json().get("ok"))
        except Exception:
            core_ok = False
        try:
            r2 = await client.get(f"{DATA_URL}/health")
            data_ok = r2.status_code == 200 and bool(r2.json().get("ok"))
        except Exception:
            data_ok = False
        return {"gateway_ok": True, "core_ok": core_ok, "data_tools_ok": data_ok, "ttfb_ms": int((time.time()-t0)*1000)}


@app.post("/api/chat")
async def api_chat(body: ChatBody):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            r = await client.post(f"{CORE_URL}/tools/chat_with_context", json=body.dict())
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")


@app.post("/api/eda/profile")
async def api_eda_profile(body: EDAProfileBody):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            r = await client.post(f"{DATA_URL}/tools/eda_summary")  # Keep legacy endpoint? ensure new
        except Exception:
            r = None
        try:
            r = await client.post(f"{DATA_URL}/tools/eda_profile", json=body.dict())
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")


@app.post("/api/upload/csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드 가능합니다.")
    bytes_ = await file.read()
    files = {"file": (file.filename, bytes_, "text/csv")}
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            r = await client.post(f"{DATA_URL}/upload/csv", files=files)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")


@app.post("/api/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
    bytes_ = await file.read()
    files = {"file": (file.filename, bytes_, "application/pdf")}
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.post(f"{DATA_URL}/upload/pdf", files=files)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

