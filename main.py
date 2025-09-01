import os
import time
import pandas as pd
import streamlit as st
from dotenv import load_dotenv
import requests

import io
import asyncio
import base64

# --- MCP Client Setup ---
try:
    from modules.mcp.client.client import call as mcp_call
except Exception:
    mcp_call = None

# --- Load Environment Variables ---
load_dotenv()

# --- Session State Initializers ---
def _init_session_state():
    if "dataset" not in st.session_state:
        st.session_state.dataset = {"name": None, "bytes": None, "df": None, "updated_at": None}
    if "knowledge" not in st.session_state:
        st.session_state.knowledge = {"pdfs": [], "indexed": False, "stats": {}}
    if "chat" not in st.session_state:
        st.session_state.chat = [{"role": "assistant", "content": "안녕하세요! CSV나 PDF를 업로드하고 질문해주세요."}]
    # 업로드 중복 실행 방지용 가드
    if "uploaded_once" not in st.session_state:
        st.session_state.uploaded_once = {"csv": set(), "pdf": set()}
    # 자동 재인덱싱 옵션 및 가드
    if "auto_reindex" not in st.session_state:
        st.session_state.auto_reindex = True
    if "auto_reindex_guard" not in st.session_state:
        st.session_state.auto_reindex_guard = None

_init_session_state()

# --- Helper Functions ---
def set_dataset(name: str, raw_bytes: bytes, df: pd.DataFrame):
    st.session_state.dataset = {
        "name": name,
        "bytes": raw_bytes,
        "df": df,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

def get_dataset_df() -> pd.DataFrame | None:
    return st.session_state.dataset.get("df")

def clear_dataset():
    st.session_state.dataset = {"name": None, "bytes": None, "df": None, "updated_at": None}

def clear_knowledge_base():
    st.session_state.knowledge = {"pdfs": [], "indexed": False, "stats": {}}

def _kb_signature() -> str:
    """현재 PDF 목록과 임베딩 설정으로 시그니처 생성.
    - PDF: (이름, 바이트 길이) 기준으로 정렬하여 포함
    - 임베딩: PROVIDER/MODEL 환경변수 포함
    """
    prov = os.getenv("EMBEDDING_PROVIDER", "google")
    model = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
    pdfs = st.session_state.knowledge.get("pdfs", [])
    items = sorted([(name, len(data)) for name, data in pdfs])
    return f"{prov}|{model}|{tuple(items)}"

# --- Page Config and Styling ---
st.set_page_config(page_title="My_AI_Agent", page_icon="✨", layout="wide")
st.title("✨ AI Agent Proto")

# --- Custom Google-style CSS ---
st.markdown(
    """
    <style>
    /* Hide the default radio button circles */
    [data-baseweb="radio"] input[type="radio"] {
        display: none;
    }
    /* Style the label container */
    section[data-testid="stSidebar"] div[role="radiogroup"] > label {
        display: flex;
        align-items: center;
        padding: 12px 15px !important; /* Increased padding */
        margin: 6px 0; /* Spacing between items */
        border-radius: 12px; /* More rounded corners */
        border: 1px solid transparent; /* Invisible border by default */
        transition: background-color 0.2s, border-color 0.2s; /* Smooth transition */
        cursor: pointer;
        user-select: none; /* Disable text selection on click */
    }
    /* Hover effect */
    section[data-testid="stSidebar"] div[role="radiogroup"] > label:hover {
        background-color: #f0f2f5; /* Light grey background on hover */
    }
    /* Selected item style */
    [data-baseweb="radio"] input:checked + div {
        background-color: #e8f0fe; /* Google's light blue selection color */
        border-left: 5px solid #1967d2; /* Google blue accent on the left */
        font-weight: 600;
        padding-left: 10px !important; /* Adjust padding for the new border */
    }
    /* Ensure text alignment is consistent */
    [data-baseweb="radio"] input:checked + div > div {
        width: 100%;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# --- Global Status Display ---
st.markdown("--- ")
c1, c2 = st.columns(2)
with c1:
    st.markdown("##### 🗂️ CSV 데이터셋 상태")
    ds = st.session_state.dataset
    if ds.get("name"):
        st.success(f"**파일:** {ds['name']}\n\n**업데이트:** {ds['updated_at']}")
        if st.button("CSV 데이터 비우기", key="clear_csv_global"):
            clear_dataset()
            st.rerun()
    else:
        st.info("업로드된 CSV 파일이 없습니다.")
with c2:
    st.markdown("##### 📚 지식 베이스 상태")
    kb = st.session_state.knowledge
    if kb.get("indexed"):
        stats = kb.get("stats", {})
        st.success(f"**{len(stats.get('files',[]))}개 파일 인덱싱 완료**\n\n**총 청크:** {stats.get('chunks',0)}")
        if st.button("지식 베이스 초기화", key="clear_rag_global"):
            clear_knowledge_base()
            st.rerun()
    elif kb.get("pdfs"):
        st.warning(f"**{len(kb['pdfs'])}개 PDF 파일 업로드됨**\n\n인덱싱이 필요합니다.")
    else:
        st.info("업로드된 PDF 파일이 없습니다.")
st.markdown("--- ")

# --- Sidebar Navigation ---
with st.sidebar:
    st.header("📑 Navigation")
    nav_items = [
        ("💬 Chat & Upload", "Chat"),
        ("📊 EDA", "EDA"),
        ("🧪 Anomaly", "Anomaly"),
        ("📚 RAG", "RAG"),
        ("⚙️ Settings", "Settings"),
    ]
    labels = [lbl for (lbl, _key) in nav_items]
    selected_label = st.radio("메뉴", labels, index=0, label_visibility="collapsed")
    current_tab = dict(nav_items)[selected_label]

# --- Main App Logic (The rest of the file remains the same) ---
if current_tab == "Chat":
    st.subheader("Chat & Upload")

    with st.expander("📂 데이터 업로드 (CSV & PDF)"):
        uploaded_csv = st.file_uploader("CSV 파일 업로드", type=["csv"], key="chat_csv_uploader")
        if uploaded_csv:
            raw_bytes = uploaded_csv.getvalue()
            try:
                df = pd.read_csv(io.BytesIO(raw_bytes))
                set_dataset(uploaded_csv.name, raw_bytes, df)

                # ✅ 같은 파일은 1번만 서버로 전송하고 토스트도 1번만
                csv_name = uploaded_csv.name
                if "uploaded_once" not in st.session_state:
                    st.session_state.uploaded_once = {"csv": set(), "pdf": set()}
                if csv_name not in st.session_state.uploaded_once["csv"]:
                    try:
                        files = {"file": (csv_name, raw_bytes, "text/csv")}
                        r = requests.post("http://localhost:8002/upload/csv", files=files, timeout=60)
                        r.raise_for_status()
                        resp = r.json()
                        st.toast(
                            f"CSV 서버 업로드 완료 · rows={resp.get('shape',{}).get('rows')} cols={resp.get('shape',{}).get('cols')}",
                            icon="✅",
                        )
                    except Exception as ee:
                        st.warning(f"CSV 서버 업로드 실패(무시 가능): {ee}")
                    # 처리 완료 마킹
                    st.session_state.uploaded_once["csv"].add(csv_name)
            except Exception as e:
                st.error(f"CSV 파일 처리 중 오류: {e}")

        uploaded_pdfs = st.file_uploader(
            "PDF 파일 업로드 (지식 베이스용)", type=["pdf"], accept_multiple_files=True, key="rag_pdf_uploader"
        )
        if uploaded_pdfs:
            existing_files = {f[0] for f in st.session_state.knowledge["pdfs"]}
            added_count = 0
            for f in uploaded_pdfs:
                name = f.name
                pdf_bytes = f.getvalue()

                # 세션 지식베이스에만 담긴 파일 체크
                if name not in existing_files:
                    st.session_state.knowledge["pdfs"].append((name, pdf_bytes))
                    added_count += 1

                # ✅ 같은 PDF는 1번만 서버 업로드 + 토스트 1회
                if "uploaded_once" not in st.session_state:
                    st.session_state.uploaded_once = {"csv": set(), "pdf": set()}
                if name not in st.session_state.uploaded_once["pdf"]:
                    try:
                        files = {"file": (name, pdf_bytes, "application/pdf")}
                        r = requests.post("http://localhost:8002/upload/pdf", files=files, timeout=120)
                        r.raise_for_status()
                        info = r.json()
                        st.toast(
                            f"PDF 서버 업로드 완료 · {info.get('filename')} ({info.get('size_bytes',0)} bytes)",
                            icon="✅",
                        )
                    except Exception as ee:
                        st.warning(f"PDF 서버 업로드 실패(무시 가능): {ee}")
                    # 처리 완료 마킹
                    st.session_state.uploaded_once["pdf"].add(name)

            if added_count > 0:
                st.session_state.knowledge["indexed"] = False

        # --- RAG 인덱싱 실행 버튼 & 자동 재인덱싱 ---
        kb = st.session_state.knowledge
        # 시그니처 계산 및 스테일 감지
        try:
            current_sig = _kb_signature()
        except Exception:
            current_sig = None
        prev_sig = kb.get("signature")
        if kb.get("indexed") and prev_sig and current_sig and prev_sig != current_sig:
            # 환경/파일 변경으로 인덱스 무효화
            kb["indexed"] = False

        if kb.get("pdfs") and not kb.get("indexed"):
            st.info(f"업로드된 PDF: {len(kb['pdfs'])}개 · 인덱싱 필요")
            # 자동 재인덱싱 토글
            st.checkbox("자동 재인덱싱", key="auto_reindex", help="PDF 목록이나 임베딩 설정이 바뀌면 자동으로 인덱싱합니다.")

            # 조건부 자동 실행 (무한 루프 방지 가드 포함)
            auto_can_run = (
                st.session_state.auto_reindex
                and current_sig
                and st.session_state.auto_reindex_guard != current_sig
            )
            do_run = auto_can_run or st.button(
                "📚 PDF 인덱싱 실행 (재인덱싱)", key="run_pdf_indexing", use_container_width=True, type="primary"
            )
            if do_run:
                try:
                    from modules.rag.rag_chain import ingest_pdfs
                    with st.spinner("PDF 파싱 · 청킹 · 임베딩 중... 잠시만요"):
                        stats = ingest_pdfs(kb["pdfs"])  # returns {files, chunks, index_dir}
                    st.session_state.knowledge["indexed"] = True
                    st.session_state.knowledge["stats"] = stats or {}
                    if current_sig:
                        st.session_state.knowledge["signature"] = current_sig
                        st.session_state.auto_reindex_guard = current_sig
                    st.toast(
                        f"인덱싱 완료 · 파일 {len(stats.get('files', []))}개 · 청크 {stats.get('chunks', 0)}개",
                        icon="✅",
                    )
                except Exception as e:
                    st.error(f"인덱싱 실패: {e}")
        elif kb.get("indexed"):
            s = kb.get("stats", {})
            st.success(
                f"인덱싱됨 · 파일 {len(s.get('files', []))}개 · 청크 {s.get('chunks', 0)}개",
                icon="📚",
            )

    # Chat Interface
    st.markdown("#### 💬 대화")
    for m in st.session_state.chat:
        st.chat_message(m["role"]).write(m["content"])

    if user_msg := st.chat_input("질문을 입력하세요…"):
        st.session_state.chat.append({"role": "user", "content": user_msg})
        with st.spinner("AI가 생각 중입니다..."):
            # ✅ 인덱싱한 벡터DB의 실제 경로를 세션에서 가져와 서버로 전달
            stats = st.session_state.knowledge.get("stats", {}) or {}
            index_dir = stats.get("index_dir")
            if index_dir:
                try:
                    index_dir = os.path.abspath(index_dir)
                except Exception:
                    pass
            # 기본 인덱스 경로(기존 인덱스가 있을 수 있음)
            default_index_dir = os.path.abspath(os.path.join("data", "vector_store", "faiss_index"))
            # 우선 세션에서 받은 경로가 유효한지 확인
            rag_index_exists = bool(index_dir and os.path.isdir(index_dir))
            # 세션 경로가 없거나 유효하지 않으면 기본 경로로 폴백
            if not rag_index_exists and os.path.isdir(default_index_dir):
                index_dir = default_index_dir
                rag_index_exists = True

            # CSV는 Base64로 같이 전달(선택)
            csv_data_b64 = (
                base64.b64encode(st.session_state.dataset["bytes"]).decode("utf-8")
                if st.session_state.dataset.get("bytes")
                else None
            )

            # ✅ core 서버가 인덱스를 직접 열 수 있도록 index_dir 포함 (기본 경로 폴백 포함)
            payload = {
                "user_query": user_msg,
                "csv_data_b64": csv_data_b64,
                "rag_index_exists": rag_index_exists,
                "index_dir": index_dir,
            }

            if not mcp_call:
                reply = "MCP 클라이언트가 비활성화 상태입니다. 설정을 확인하세요."
            else:
                try:
                    response = mcp_call("ai.agent.core_logic/chat_with_context", payload)
                    reply = response.get("answer", "오류: 답변을 받지 못했습니다.")
                except Exception as e:
                    reply = f"서버 통신 중 오류가 발생했습니다: {e}"
        
        st.session_state.chat.append({"role": "assistant", "content": reply})
        st.rerun()

elif current_tab == "EDA":
    st.subheader("EDA — 탐색적 데이터 분석")

    df = get_dataset_df()
    if df is None:
        st.warning("CSV 데이터셋이 없습니다. 'Chat & Upload' 탭에서 CSV를 업로드하세요.")
        st.stop()

    st.caption(f"데이터셋: {st.session_state.dataset['name']} · shape: {df.shape[0]} x {df.shape[1]}")

    # 미리보기 & 핵심 지표
    with st.expander("📄 데이터 미리보기 (상위 200행)", expanded=False):
        st.dataframe(df.head(200))

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("행(Row)", f"{len(df):,}")
    with c2:
        st.metric("열(Columns)", f"{len(df.columns):,}")
    with c3:
        st.metric("결측치(Cells)", f"{int(df.isna().sum().sum()):,}")

    # 고급 EDA (모듈이 있으면 사용, 없으면 내장 대체)
    try:
        from modules.processing.eda import quick_summary, plot_corr  # summary_to_cards는 선택
        summary = quick_summary(df)

        # summary_to_cards가 있으면 카드 형태로 출력
        try:
            from modules.processing.eda import summary_to_cards
            cards = summary_to_cards(summary)
            st.markdown("#### 🧾 요약 카드")
            for card in cards:
                st.markdown(f"**{card.get('title','')}**")
                body = card.get('body')
                if isinstance(body, (list, dict)):
                    st.json(body)
                else:
                    st.write(body)
        except Exception:
            st.markdown("#### 🧮 요약 통계")
            try:
                st.write(summary)
            except Exception:
                st.write("요약 통계를 렌더링하는 중 문제가 발생했습니다.")

        # 상관관계 히트맵 (모듈 버전)
        st.markdown("#### 📈 상관관계 히트맵")
        try:
            fig = plot_corr(df)
            st.pyplot(fig, clear_figure=True)
        except Exception as e:
            st.info(f"외부 plot_corr 사용 실패: {e} → 내장 히트맵으로 대체합니다.")
            import matplotlib.pyplot as plt
            num_df = df.select_dtypes(include='number')
            if not num_df.empty:
                corr = num_df.corr(numeric_only=True)
                fig, ax = plt.subplots()
                cax = ax.imshow(corr, aspect='auto')
                ax.set_xticks(range(len(corr.columns)))
                ax.set_yticks(range(len(corr.columns)))
                ax.set_xticklabels(corr.columns, rotation=90)
                ax.set_yticklabels(corr.columns)
                fig.colorbar(cax)
                st.pyplot(fig, clear_figure=True)
            else:
                st.warning("수치형 컬럼이 없어 히트맵을 표시할 수 없습니다.")

    except Exception as e:
        # 내장 EDA 대체 루틴
        st.info(f"외부 EDA 모듈을 불러오지 못했습니다: {e} → 내장 요약으로 표시합니다.")
        st.markdown("#### 🧮 기본 통계 (describe)")
        try:
            st.write(df.describe(include='all').transpose())
        except Exception:
            st.write(df.describe().transpose())

        # 상관관계 히트맵 (내장)
        import matplotlib.pyplot as plt
        num_df = df.select_dtypes(include='number')
        if not num_df.empty:
            corr = num_df.corr(numeric_only=True)
            fig, ax = plt.subplots()
            cax = ax.imshow(corr, aspect='auto')
            ax.set_xticks(range(len(corr.columns)))
            ax.set_yticks(range(len(corr.columns)))
            ax.set_xticklabels(corr.columns, rotation=90)
            ax.set_yticklabels(corr.columns)
            fig.colorbar(cax)
            st.pyplot(fig, clear_figure=True)
        else:
            st.warning("수치형 컬럼이 없어 상관관계를 계산할 수 없습니다.")

elif current_tab == "RAG":
    st.subheader("RAG — 검색 테스트")
    from modules.rag.rag_chain import compose_answer
    from modules.rag.retriever import retrieve

    kb = st.session_state.knowledge
    if not kb.get("indexed"):
        st.warning("지식 베이스가 비어있습니다. 'Chat & Upload' 탭에서 PDF를 업로드하고 인덱싱을 먼저 실행하세요.")
        st.stop()

    st.info(f"현재 인덱싱된 파일: {len(kb.get('stats', {}).get('files', []))}개, 총 청크: {kb.get('stats', {}).get('chunks', 0)}개")
    st.divider()

    st.markdown("#### 🔍 검색 및 파라미터 설정")
    q = st.text_input("문서에서 찾을 내용을 입력하세요.", key="rag_query")

    colA, colB = st.columns(2)
    with colA:
        top_k = st.slider("Top-K (검색할 문서 조각 수)", 1, 10, 5, key="rag_topk")
    with colB:
        temperature = st.slider("Temperature (답변의 창의성)", 0.0, 1.0, 0.1, step=0.05, key="rag_temp", help="LLM이 답변을 생성할 때의 창의성을 조절합니다. 현재는 기능이 연결되지 않았습니다.")

    if st.button("검색 및 답변 생성", key="rag_search"):
        if not q:
            st.warning("검색어를 입력하세요.")
        else:
            with st.spinner("검색 중..."):
                hits = retrieve(q, k=top_k)

            st.markdown("#### 📝 검색된 문서 조각")
            with st.expander("자세히 보기"):
                items = []
                for h in hits:
                    # LangChain Document 우선 처리
                    if hasattr(h, "page_content"):
                        text = getattr(h, "page_content", "")
                        meta = getattr(h, "metadata", {})
                        score = getattr(h, "score", None)
                        items.append({
                            "score": score,
                            "meta": meta,
                            "text": (text[:500] + ("…" if len(text) > 500 else "")),
                        })
                    elif isinstance(h, dict):
                        txt = h.get("text") or h.get("page_content") or ""
                        items.append({
                            "score": h.get("score"),
                            "meta": h.get("meta", {}),
                            "text": (txt[:500] + ("…" if len(txt) > 500 else "")),
                        })
                    else:
                        s = str(h)
                        items.append({"text": (s[:500] + ("…" if len(s) > 500 else ""))})
                st.json(items)

            st.markdown("#### 💬 답변")
            with st.spinner("답변 생성 중..."):
                answer = compose_answer(hits, q, temperature)
            st.write(answer)
