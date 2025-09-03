from __future__ import annotations

import os
import time
import pandas as pd
import streamlit as st


def ensure_session_state() -> None:
    if "dataset" not in st.session_state:
        st.session_state.dataset = {"name": None, "bytes": None, "df": None, "updated_at": None}
    if "knowledge" not in st.session_state:
        st.session_state.knowledge = {"pdfs": [], "indexed": False, "stats": {}}
    if "chat" not in st.session_state:
        st.session_state.chat = [{"role": "assistant", "content": "안녕하세요! CSV나 PDF를 업로드하고 질문해주세요."}]
    if "eda_chat" not in st.session_state:
        st.session_state.eda_chat = [{"role": "assistant", "content": "EDA 탭입니다. 현재 데이터에 대해 질문하실 수 있어요."}]
    if "uploaded_once" not in st.session_state:
        st.session_state.uploaded_once = {"csv": set(), "pdf": set()}
    if "auto_reindex" not in st.session_state:
        st.session_state.auto_reindex = True
    if "auto_reindex_guard" not in st.session_state:
        st.session_state.auto_reindex_guard = None


def set_dataset(name: str, raw_bytes: bytes, df: pd.DataFrame) -> None:
    st.session_state.dataset = {
        "name": name,
        "bytes": raw_bytes,
        "df": df,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


def get_dataset_df() -> pd.DataFrame | None:
    return st.session_state.dataset.get("df")


def clear_dataset() -> None:
    st.session_state.dataset = {"name": None, "bytes": None, "df": None, "updated_at": None}


def clear_knowledge_base() -> None:
    st.session_state.knowledge = {"pdfs": [], "indexed": False, "stats": {}}


def kb_signature() -> str:
    prov = os.getenv("EMBEDDING_PROVIDER", "google")
    model = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
    pdfs = st.session_state.knowledge.get("pdfs", [])
    items = sorted([(name, len(data)) for name, data in pdfs])
    return f"{prov}|{model}|{tuple(items)}"

