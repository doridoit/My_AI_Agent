from __future__ import annotations

import os
import io
import base64
import requests
import pandas as pd
import streamlit as st

from app.state import set_dataset, clear_dataset, clear_knowledge_base


def render(mcp_call):
    st.subheader("Chat & Upload")

    with st.expander("📂 데이터 업로드 (CSV & PDF)"):
        uploaded_csv = st.file_uploader("CSV 파일 업로드", type=["csv"], key="chat_csv_uploader")
        if uploaded_csv:
            raw_bytes = uploaded_csv.getvalue()
            try:
                df = pd.read_csv(io.BytesIO(raw_bytes))
                set_dataset(uploaded_csv.name, raw_bytes, df)

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
                if name not in existing_files:
                    st.session_state.knowledge["pdfs"].append((name, pdf_bytes))
                    added_count += 1
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
                    st.session_state.uploaded_once["pdf"].add(name)

            if added_count > 0:
                st.session_state.knowledge["indexed"] = False

        kb = st.session_state.knowledge
        try:
            from app.state import kb_signature as _kb_signature
            current_sig = _kb_signature()
        except Exception:
            current_sig = None
        prev_sig = kb.get("signature")
        if kb.get("indexed") and prev_sig and current_sig and prev_sig != current_sig:
            kb["indexed"] = False

        if kb.get("pdfs") and not kb.get("indexed"):
            st.info(f"업로드된 PDF: {len(kb['pdfs'])}개 · 인덱싱 필요")
            st.checkbox("자동 재인덱싱", key="auto_reindex", help="PDF 목록이나 임베딩 설정이 바뀌면 자동으로 인덱싱합니다.")
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

    st.markdown("#### 💬 대화")
    for m in st.session_state.chat:
        st.chat_message(m["role"]).write(m["content"])

    if user_msg := st.chat_input("질문을 입력하세요…"):
        st.session_state.chat.append({"role": "user", "content": user_msg})
        with st.spinner("AI가 생각 중입니다..."):
            stats = st.session_state.knowledge.get("stats", {}) or {}
            index_dir = stats.get("index_dir")
            if index_dir:
                try:
                    index_dir = os.path.abspath(index_dir)
                except Exception:
                    pass
            default_index_dir = os.path.abspath(os.path.join("data", "vector_store", "faiss_index"))
            rag_index_exists = bool(index_dir and os.path.isdir(index_dir))
            if not rag_index_exists and os.path.isdir(default_index_dir):
                index_dir = default_index_dir
                rag_index_exists = True

            csv_data_b64 = (
                base64.b64encode(st.session_state.dataset["bytes"]).decode("utf-8")
                if st.session_state.dataset.get("bytes")
                else None
            )

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

