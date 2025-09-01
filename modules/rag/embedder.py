from __future__ import annotations
from typing import List
import os
import hashlib
import numpy as np
import time
from dotenv import load_dotenv

# Ensure .env is loaded for both UI and server processes
try:
    load_dotenv()
except Exception:
    pass

try:
    import google.generativeai as genai
    _HAS_GEMINI = True
except ImportError:
    genai = None
    _HAS_GEMINI = False

# Gemini Embedding 모델의 최대 배치 크기
GEMINI_BATCH_SIZE = 100
_DIM = int(os.getenv("EMBEDDING_DIM", "768")) # Gemini text-embedding-004 모델은 768 차원

def _hash_embed(text: str, dim: int = _DIM) -> List[float]:
    """Google API 실패 시 사용할 매우 기본적인 폴백 임베딩"""
    h = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    rng = np.frombuffer(h, dtype=np.uint8).astype(np.float32)
    v = np.tile(rng, (dim // len(rng) + 1))[:dim].astype(np.float32)
    v = v - v.mean()
    n = np.linalg.norm(v) + 1e-12
    return (v / n).tolist()

def embed_texts(texts: List[str], is_query: bool = False) -> List[List[float]]:
    """
    주어진 텍스트 목록을 배치 처리하여 임베딩합니다.
    오류 발생 시 명시적인 예외를 발생시킵니다.
    """
    provider = os.getenv("EMBEDDING_PROVIDER", "google").lower()
    
    if provider == "google" and _HAS_GEMINI and os.getenv("GOOGLE_API_KEY"):
        try:
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            model = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
            
            all_embeddings = []
            # 텍스트를 배치로 나누어 처리
            for i in range(0, len(texts), GEMINI_BATCH_SIZE):
                batch = texts[i:i+GEMINI_BATCH_SIZE]
                # 쿼리 임베딩인지 문서 임베딩인지에 따라 task_type 지정
                task_type = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"
                result = genai.embed_content(model=model, content=batch, task_type=task_type)
                all_embeddings.extend(result["embedding"])
                # API 속도 제한을 피하기 위한 약간의 딜레이
                if len(texts) > GEMINI_BATCH_SIZE:
                    time.sleep(0.1)
            return all_embeddings
        except Exception as e:
            print(f"[ERROR] Google Gemini 임베딩 실패: {e}")
            raise RuntimeError(f"Google Gemini 임베딩 API 호출에 실패했습니다. API 키와 할당량을 확인하세요. 오류: {e}")

    # Google API를 사용할 수 없을 때의 폴백
    print("[WARN] Google provider를 사용할 수 없어 해시 기반 임베딩으로 대체합니다.")
    return [_hash_embed(t) for t in texts]
