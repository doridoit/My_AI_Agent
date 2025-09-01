import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from langchain_community.vectorstores import FAISS
from langchain.embeddings.base import Embeddings
from typing import List
from .embedder import embed_texts

# --- CONFIGS ---
VECTOR_STORE_DIR = "data/vector_store"
INDEX_NAME = "faiss_index"

class CustomEmbeddings(Embeddings):
    """LangChain Embeddings 인터페이스 구현체."""
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return embed_texts(texts, is_query=False)

    def embed_query(self, text: str) -> List[float]:
        return embed_texts([text], is_query=True)[0]

def retrieve(query: str, k: int = 5) -> list:
    """
    저장된 FAISS 인덱스를 로드하여 주어진 쿼리와 가장 유사한 k개의 문서를 검색합니다.
    """
    index_path = os.path.join(VECTOR_STORE_DIR, INDEX_NAME)
    if not os.path.exists(index_path):
        raise FileNotFoundError(f"Vector store index not found at {index_path}. Please run indexing first.")

    # 인덱싱에 사용된 것과 동일한 임베딩 모델 로드
    embeddings = CustomEmbeddings()

    # 로컬 인덱스 로드
    vector_store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)

    # 유사도 검색 실행
    hits = vector_store.similarity_search(query, k=k)

    return hits
