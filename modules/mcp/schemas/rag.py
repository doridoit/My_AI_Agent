# modules/mcp/schemas/rag.py
from pydantic import BaseModel
from typing import Optional

class RAGParams(BaseModel):
    query: str

class RAGQueryResponse(BaseModel):
    answer: str
    sources: Optional[str] = None
    query: str

# chat_with_context에 사용할 파라미터 모델 추가
class ChatWithContextParams(BaseModel):
    user_query: str
    csv_data_b64: Optional[str] = None
    rag_index_exists: bool = False