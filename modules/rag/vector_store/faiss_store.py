from __future__ import annotations
import os, json
from typing import List, Dict, Optional
import numpy as np

# Try FAISS, fallback to brute-force cosine
try:
    import faiss  # pip install faiss-cpu
    _HAS_FAISS = True
except Exception:
    faiss = None  # type: ignore
    _HAS_FAISS = False

def _ensure_dir(d: str):
    os.makedirs(d, exist_ok=True)

class LocalFAISS:
    """Disk-backed vector store (FAISS if available, otherwise brute-force cosine)."""

    def __init__(self, index_dir: str):
        self.index_dir = index_dir
        _ensure_dir(index_dir)
        self.meta_path = os.path.join(index_dir, "metas.json")
        self.faiss_path = os.path.join(index_dir, "faiss.index")
        self.npy_path = os.path.join(index_dir, "index.npy")
        self._metas: List[Dict] = []
        self._dim: Optional[int] = None
        self._index = None
        self._load()

    def _load(self):
        if os.path.exists(self.meta_path):
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self._metas = json.load(f)
        if _HAS_FAISS and os.path.exists(self.faiss_path):
            self._index = faiss.read_index(self.faiss_path)
            self._dim = self._index.d
        elif (not _HAS_FAISS) and os.path.exists(self.npy_path):
            arr = np.load(self.npy_path)
            self._index = self._normalize(arr)
            self._dim = self._index.shape[1]

    def _save(self, vectors: Optional[np.ndarray] = None):
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self._metas, f, ensure_ascii=False)
        if _HAS_FAISS and self._index is not None:
            faiss.write_index(self._index, self.faiss_path)
        elif (not _HAS_FAISS) and vectors is not None:
            np.save(self.npy_path, vectors)

    @staticmethod
    def _normalize(x: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
        return x / norm

    def upsert(self, embeddings: np.ndarray, metas: List[Dict]):
        assert len(embeddings) == len(metas), "embeddings and metas length mismatch"
        if _HAS_FAISS:
            vecs = embeddings.astype("float32")
            if self._index is None:
                self._dim = vecs.shape[1]
                self._index = faiss.IndexFlatIP(self._dim)
            faiss.normalize_L2(vecs)
            self._index.add(vecs)
            self._metas.extend(metas)
            self._save()
        else:
            vecs = self._normalize(embeddings.astype("float32"))
            if self._index is None:
                self._index = vecs
                self._dim = vecs.shape[1]
            else:
                self._index = np.vstack([self._index, vecs])
            self._metas.extend(metas)
            self._save(vectors=self._index)

    def search(self, query_vec: np.ndarray, k: int = 5) -> List[Dict]:
        if query_vec.ndim == 1:
            query_vec = query_vec.reshape(1, -1)
        if _HAS_FAISS and self._index is not None:
            q = query_vec.astype("float32").copy()
            faiss.normalize_L2(q)
            sims, idxs = self._index.search(q, k)
            return self._collect(sims[0], idxs[0])
        elif (not _HAS_FAISS) and self._index is not None:
            q = self._normalize(query_vec.astype("float32"))
            sims = (self._index @ q.T).ravel()
            topk = np.argsort(-sims)[:k]
            return self._collect(sims[topk], topk)
        else:
            return []

    def _collect(self, sims: np.ndarray, idxs: np.ndarray) -> List[Dict]:
        out: List[Dict] = []
        for s, i in zip(sims, idxs):
            if i < 0 or i >= len(self._metas):
                continue
            m = self._metas[int(i)]
            out.append({
                "text": m.get("text", ""),
                "score": float(s),
                "meta": {k: v for k, v in m.items() if k != "text"},
            })
        return out