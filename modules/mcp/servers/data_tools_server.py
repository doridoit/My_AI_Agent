# Ensure project root on sys.path for absolute imports
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from pydantic import BaseModel
import pandas as pd
import base64, io, time, requests
import numpy as np
from typing import Optional, Dict, Any, List
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from modules.rag.retriever import CustomEmbeddings

try:
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import StandardScaler
except Exception:
    PCA = None
    StandardScaler = None

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

# --- RAG indexing for PDFs ---------------------------------------------------
@app.post("/tools/rag_index")
async def rag_index(files: List[UploadFile] = File(...)):
    """Accept one or more PDFs, build/save FAISS index, return index_dir."""
    if not files:
        raise HTTPException(status_code=400, detail="PDF 파일이 없습니다.")
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"PDF만 허용됩니다: {f.filename}")

    tmp_dir = os.path.abspath(os.path.join("data", "tmp_uploads"))
    os.makedirs(tmp_dir, exist_ok=True)
    docs = []
    names: List[str] = []
    for uf in files:
        raw = await uf.read()
        tmp_path = os.path.join(tmp_dir, f"{int(time.time()*1000)}_{uf.filename}")
        with open(tmp_path, "wb") as w:
            w.write(raw)
        try:
            loader = PyPDFLoader(tmp_path)
            docs.extend(loader.load())
            names.append(uf.filename)
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    if not docs:
        raise HTTPException(status_code=400, detail="PDF에서 텍스트를 추출하지 못했습니다.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_documents(docs)

    embeddings = CustomEmbeddings()
    vs = FAISS.from_documents(chunks, embeddings)

    base_dir = os.path.abspath(os.path.join("data", "vector_store"))
    os.makedirs(base_dir, exist_ok=True)
    index_dir = os.path.join(base_dir, "faiss_index")
    vs.save_local(index_dir)

    return {"ok": True, "files": names, "chunks": len(chunks), "index_dir": index_dir}

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

class EDAProfileParams(BaseModel):
    csv_b64: str
    max_pca_points: int = 2000
    random_state: int = 42

@app.post("/tools/eda_profile")
def eda_profile(params: EDAProfileParams):
    raw = base64.b64decode(params.csv_b64.encode())
    df = pd.read_csv(io.BytesIO(raw))

    # Basic info
    n_rows, n_cols = df.shape
    nulls = df.isna().sum().astype(int).to_dict()
    dtypes = df.dtypes.astype(str).to_dict()

    # Numeric statistics
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    numeric_stats: Dict[str, Dict[str, Any]] = {}
    for c in numeric_cols:
        s = df[c]
        if not np.issubdtype(s.dtype, np.number):
            continue
        sd = s.dropna()
        if sd.empty:
            continue
        mean_v = float(sd.mean())
        std_v = float(sd.std(ddof=1)) if len(sd) > 1 else 0.0
        median_v = float(sd.median())
        q1_v = float(sd.quantile(0.25))
        q3_v = float(sd.quantile(0.75))
        min_v = float(sd.min())
        max_v = float(sd.max())
        # Additional metrics
        try:
            skew_v = float(sd.skew())
        except Exception:
            skew_v = 0.0
        try:
            kurt_v = float(sd.kurt())
        except Exception:
            kurt_v = 0.0
        try:
            mad_v = float(np.median(np.abs(sd - median_v)))
        except Exception:
            mad_v = 0.0
        if std_v and std_v > 0:
            z_outliers = np.abs((sd - mean_v) / std_v) > 3.0
            zout_cnt = int(z_outliers.sum())
        else:
            zout_cnt = 0
        numeric_stats[c] = {
            "min": min_v,
            "q1": q1_v,
            "median": median_v,
            "q3": q3_v,
            "max": max_v,
            "mean": mean_v,
            "std": std_v,
            "skew": skew_v,
            "kurtosis": kurt_v,  # Pandas kurt: excess kurtosis
            "mad": mad_v,
            "z_outliers_count": zout_cnt,
            "missing": int(s.isna().sum()),
        }

    # Categorical top counts
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    category_counts: Dict[str, List[List[Any]]] = {}
    for c in cat_cols:
        try:
            vc = df[c].astype(str).fillna("<NA>").value_counts(dropna=False).head(15)
            category_counts[c] = [[k, int(v)] for k, v in vc.items()]
        except Exception:
            continue

    # PCA 2D (if sklearn available and enough numeric columns)
    pca_payload = None
    if PCA is not None and StandardScaler is not None and len(numeric_cols) >= 2:
        try:
            X = df[numeric_cols].copy()
            # Impute with mean for simplicity
            X = X.astype(float)
            X = X.fillna(X.mean(numeric_only=True))
            # Remove zero-variance columns
            var = X.var(numeric_only=True)
            keep = var[var > 0].index.tolist()
            X = X[keep]
            if X.shape[1] >= 2:
                # Sample rows for payload size safety
                rng = np.random.default_rng(params.random_state)
                idx = np.arange(len(X))
                if len(X) > params.max_pca_points:
                    idx = rng.choice(idx, size=params.max_pca_points, replace=False)
                    idx.sort()
                Xs = X.iloc[idx]
                scaler = StandardScaler()
                Xn = scaler.fit_transform(Xs.values)
                pca = PCA(n_components=2, random_state=params.random_state)
                xy = pca.fit_transform(Xn)
                pca_payload = {
                    "row_indices": idx.tolist() if isinstance(idx, np.ndarray) else list(idx),
                    "x": xy[:, 0].astype(float).tolist(),
                    "y": xy[:, 1].astype(float).tolist(),
                    "explained_variance_ratio": [float(v) for v in pca.explained_variance_ratio_],
                }
        except Exception as e:
            pca_payload = {"error": str(e)}

    return {
        "shape": {"rows": int(n_rows), "cols": int(n_cols)},
        "nulls": nulls,
        "dtypes": dtypes,
        "numeric_stats": numeric_stats,
        "category_counts": category_counts,
        "pca2d": pca_payload,
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
