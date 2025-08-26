from pydantic import BaseModel

class RAGParams(BaseModel):
    query: str
