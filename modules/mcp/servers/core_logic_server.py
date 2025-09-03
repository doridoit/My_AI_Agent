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
    eda_context: Optional[str] = None

class RAGQueryResponse(BaseModel):
    answer: str
    sources: str
    query: str

PROMPT_TEMPLATE = """
당신은 데이터 분석 어시스턴트입니다. 아래 컨텍스트를 참고하되, 질문 의도에 맞춰 유연하게 답하세요.

규칙:
- 먼저 질문 의도(의도)가 '일반/개념 설명'인지 '데이터셋 관련 분석'인지 파악하세요.
- 의도가 '일반/개념 설명'이면: 일반 지식을 기반으로 명확히 설명하고, 컨텍스트가 불필요하면 굳이 언급하지 마세요. 정보 부족을 이유로 답변을 거절하지 마세요.
- 의도가 '데이터셋 관련 분석'이면: 제공된 CSV/EDA/RAG 컨텍스트를 우선적으로 활용해 간결하고 근거 있는 답변을 하세요.
- 정보가 부족하면 필요한 추가 정보를 1문장 질문으로 요청하세요.
- CSV 요약이 있을 때는 핵심 지표(TAG 분포, 주요 수치형 평균/최솟값/최댓값, 시간 범위)를 최대 3~5줄로 간단히 먼저 정리하고 답변을 이어가세요.

{rag_notice}
의도: {user_intent}
--- 컨텍스트 시작 ---

### 문서 발췌(RAG):
{rag_context}

### CSV 요약:
{csv_context}

### EDA 추가 요약:
{eda_context}

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

    # 의도 감지: 일반/개념 질문이면 RAG 안내문구를 숨기고 일반 지식으로도 답변 허용
    def _is_general_question(q: str) -> bool:
        if not q:
            return False
        ql = q.lower()
        general_kws = [
            "차트 엔진", "엔진 차이", "인터렉티브", "인터랙티브", "정적", "altair", "matplotlib", "plotly",
            "시각화 차이", "비교", "무엇", "어떤", "차이점", "설명", "방법",
        ]
        dataset_kws = [
            "csv", "컬럼", "열", "행", "평균", "최댓값", "최솟값", "시간", "분포", "상관", "이상치", "태그", "std_dt",
        ]
        if any(k in q for k in general_kws) and not any(k in ql for k in dataset_kws):
            return True
        return False

    is_general = _is_general_question(user_query)

    rag_notice = ""
    if not is_general and attempted_rag and not rag_context:
        rag_notice = "참고: RAG 검색 결과가 없어 CSV 위주로 답합니다.\n"

    final_prompt = PROMPT_TEMPLATE.format(
        rag_notice=rag_notice,
        rag_context=rag_context,
        csv_context=csv_context,
        eda_context=(params.eda_context or ""),
        user_intent=("일반/개념 설명" if is_general else "데이터셋 관련 분석"),
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
