# Ensure project root is on sys.path
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import base64, io
from typing import Optional, List, Dict
import pandas as pd

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ...rag.retriever import retrieve, CustomEmbeddings
from ...chatbot.chain_factory import create_gemini_chat_chain
from langchain_community.vectorstores import FAISS

# ---------- Schemas ----------
class ChatWithContextParams(BaseModel):
    user_query: str
    csv_data_b64: Optional[str] = None
    rag_index_exists: bool = False
    index_dir: Optional[str] = None

class RAGQueryResponse(BaseModel):
    answer: str
    sources: str
    query: str

PROMPT_TEMPLATE = """
당신은 데이터 분석 어시스턴트입니다. 아래 컨텍스트를 활용해 사용자 질문에 간결하고 사실 기반으로 답하세요.

규칙:
- RAG 문서 컨텍스트가 비어있거나 로딩에 실패한 경우, 첫 줄에 "참고: PDF 컨텍스트를 사용할 수 없어 CSV만으로 답합니다."라고 간단히 알리고, 이어서 CSV 요약만으로 답하세요.
- 불필요한 사과나 장황한 설명은 피하고, 가능한 한 바로 답을 제시하세요.
- 정보가 부족하면 추가로 필요한 정보를 간단히 질문 형태로 요청하세요.
 - CSV 요약이 제공된 경우, 핵심 지표(TAG 분포, 주요 수치형 컬럼의 평균/최솟값/최댓값, 시간 범위)를 3~5줄로 간단히 먼저 정리하고 답변을 이어가세요.

{rag_notice}
--- 컨텍스트 시작 ---

### 문서 발췌(RAG):
{rag_context}

### CSV 요약:
{csv_context}

--- 컨텍스트 끝 ---

사용자 질문: {user_query}

답변:
"""

# ---------- FastAPI app ----------
load_dotenv()  # Load .env for this server process (embeddings/LLM keys)
app = FastAPI(title="ai.agent.core_logic", description="Core logic server for orchestrating AI capabilities.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DEV: allow all origins to eliminate CORS 403
    allow_credentials=False,
    allow_methods=["*"],  # allow all methods (GET/POST/OPTIONS/etc.)
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# ---------- Endpoints ----------
@app.post("/tools/chat_with_context", response_model=RAGQueryResponse)
def chat_with_context(params: ChatWithContextParams) -> RAGQueryResponse:
    user_query = params.user_query
    csv_data_b64 = params.csv_data_b64

    # 기본: RAG 컨텍스트는 비워서 LLM이 사과/거절을 생성하지 않도록 한다
    rag_context = ""
    attempted_rag = False
    # 우선순위: 클라이언트에서 전달된 index_dir 사용 (LangChain FAISS 포맷)
    idx_dir = getattr(params, "index_dir", None)
    if idx_dir and os.path.isdir(idx_dir):
        attempted_rag = True
        try:
            embeddings = CustomEmbeddings()
            store = FAISS.load_local(idx_dir, embeddings=embeddings, allow_dangerous_deserialization=True)
            hits = store.similarity_search(user_query, k=5)
            texts: List[str] = []
            for h in hits:
                if hasattr(h, "page_content"):
                    texts.append(h.page_content)
                elif isinstance(h, dict):
                    texts.append(h.get("text") or h.get("page_content") or "")
                else:
                    texts.append(str(h))
            if texts:
                rag_context = "\n\n---\n\n".join(texts)
        except Exception as e:
            # 서버 로그로만 남기고 프롬프트에는 노출하지 않음
            print(f"[RAG] load/search failed for index_dir={idx_dir}: {e}")
            rag_context = ""
    elif params.rag_index_exists:
        # 호환성: index_dir를 받지 못했지만 서버 기본 검색기가 설정되어 있는 경우
        attempted_rag = True
        try:
            hits = retrieve(user_query, k=5)
            items: List[str] = []
            for h in hits:
                if hasattr(h, "page_content"):
                    items.append(h.page_content)
                elif isinstance(h, dict):
                    items.append(h.get("text") or h.get("page_content") or "")
            if items:
                rag_context = "\n\n---\n\n".join(items)
        except Exception as e:
            print(f"[RAG] fallback retrieve failed: {e}")
            rag_context = ""

    csv_context = "(해당 없음)"
    if csv_data_b64:
        try:
            decoded = base64.b64decode(csv_data_b64)
            df = pd.read_csv(io.BytesIO(decoded))

            n_rows, n_cols = map(int, df.shape)
            cols = df.columns.tolist()
            dtypes: Dict[str, str] = df.dtypes.astype(str).to_dict()
            nulls: Dict[str, int] = df.isna().sum().astype(int).to_dict()

            # 숫자형 요약(상위 6개만)
            num_cols = df.select_dtypes(include=["number"]).columns.tolist()
            num_cols_show = num_cols[:6]
            num_summ_lines = []
            for c in num_cols_show:
                s = df[c]
                try:
                    num_summ_lines.append(
                        f"{c}: mean={s.mean():.3f}, std={s.std():.3f}, min={s.min():.3f}, max={s.max():.3f}"
                    )
                except Exception:
                    continue

            # TAG/범주 요약
            cat_lines = []
            cat_target = None
            if "TAG" in df.columns:
                cat_target = "TAG"
            else:
                for c in df.select_dtypes(include=["object", "category"]).columns:
                    try:
                        if df[c].nunique(dropna=True) <= 20:
                            cat_target = c
                            break
                    except Exception:
                        continue
            if cat_target is not None:
                try:
                    vc = df[cat_target].value_counts(dropna=False).head(10)
                    cat_lines.append(f"{cat_target} 분포(상위10): " + ", ".join([f"{k}:{int(v)}" for k, v in vc.items()]))
                except Exception:
                    pass

            # 시간 범위(있으면)
            time_line = None
            if "STD_DT" in df.columns:
                try:
                    ts = pd.to_datetime(df["STD_DT"], errors="coerce")
                    tmin, tmax = ts.min(), ts.max()
                    if pd.notna(tmin) and pd.notna(tmax):
                        time_line = f"STD_DT 범위: {tmin} → {tmax}"
                except Exception:
                    pass

            sample_str = df.head(3).to_string()
            parts = [
                f"파일: user_upload.csv | shape: {n_rows} x {n_cols}",
                f"컬럼: {cols}",
                f"dtypes: {dtypes}",
                f"nulls: {nulls}",
            ]
            if time_line:
                parts.append(time_line)
            if num_summ_lines:
                parts.append("수치 요약: " + " | ".join(num_summ_lines))
            if cat_lines:
                parts.extend(cat_lines)
            parts.append("샘플(상위 3행):\n" + sample_str)
            csv_context = "\n".join(parts)
        except Exception as e:
            csv_context = f"(CSV 데이터 처리 중 오류 발생: {e})"

    # RAG 시도를 했으나 컨텍스트가 비어 있으면 간단한 공지 문구를 추가
    rag_notice = ""
    if attempted_rag and not rag_context:
        rag_notice = "참고: RAG 검색 결과가 없어 CSV 위주로 답합니다.\n"

    final_prompt = PROMPT_TEMPLATE.format(
        rag_notice=rag_notice,
        rag_context=rag_context,
        csv_context=csv_context,
        user_query=user_query,
    )

    try:
        llm = create_gemini_chat_chain()
        resp = llm.invoke(final_prompt)
        answer = getattr(resp, "content", str(resp))
        return RAGQueryResponse(answer=answer, sources=rag_context, query=user_query)
    except Exception as e:
        return RAGQueryResponse(answer=f"LLM 호출 중 오류가 발생했습니다: {e}", sources=rag_context, query=user_query)

@app.get("/health")
def health():
    return {"ok": True}

@app.head("/health")
def health_head():
    from starlette.responses import Response
    return Response(status_code=204)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
