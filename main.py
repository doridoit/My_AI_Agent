import os
import time
import pandas as pd
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

REQUIRED_KEYS = []  # Fill later for LLM/RAG
USE_MCP = os.getenv("MCP_ENABLED", "false").lower() == "true"

def check_keys():
    missing = [k for k in REQUIRED_KEYS if not os.getenv(k)]
    if missing:
        st.error(f"필수 환경변수 누락: {missing}. 일부 기능이 비활성화됩니다.")
    return missing

if "ping_running" not in st.session_state:
    st.session_state.ping_running = False
    st.session_state.last_ping = {}

def do_ping(url: str, timeout=5):
    import requests
    t0 = time.time()
    try:
        r = requests.get(url, timeout=timeout)
        return {"status": r.status_code, "elapsed": round(time.time()-t0, 3)}
    except Exception as e:
        return {"error": str(e)}

from modules.processing.eda import quick_summary

st.set_page_config(page_title="AI Agent Proto", layout="wide")
st.title("AI Agent Proto — P0")
check_keys()

TAB_CHAT, TAB_EDA, TAB_ANOM, TAB_RAG, TAB_HEALTH = st.tabs([
    "Chat", "EDA", "Anomaly (stub)", "RAG (stub)", "Health"])

with TAB_CHAT:
    st.subheader("Chat (P0 템플릿)")
    if "chat" not in st.session_state:
        st.session_state.chat = []
    user_msg = st.chat_input("질문을 입력하세요…")
    if user_msg:
        st.session_state.chat.append({"role": "user", "content": user_msg})
        reply = f"(P0) 아직 LLM 연결 전이에요. 질문: {user_msg}"
        st.session_state.chat.append({"role": "assistant", "content": reply})
    for m in st.session_state.chat:
        st.chat_message(m["role"]).write(m["content"])

with TAB_EDA:
    st.subheader("Quick EDA")
    f = st.file_uploader("CSV 업로드", type=["csv"]) 
    if f:
        df = pd.read_csv(f)
        st.write("미리보기", df.head())
        if st.button("요약 계산"):
            st.write(quick_summary(df))
    st.divider()
    if st.button("대화 로그 CSV 내보내기"):
        import io
        chat = st.session_state.get("chat", [])
        if chat:
            df = pd.DataFrame(chat)
            csv = df.to_csv(index=False).encode("utf-8")
            st.download_button("다운로드", csv, "chat_log.csv", "text/csv")
        else:
            st.info("저장할 대화가 없습니다.")

with TAB_ANOM:
    st.subheader("Anomaly (P1에서 구현)")
    st.info("P1에서 Z-score/IQR/IsolationForest 추가 예정")

with TAB_RAG:
    st.subheader("RAG (P1에서 구현)")
    st.info("P1에서 PDF 파서/임베딩/리트리버/인용 추가 예정")

with TAB_HEALTH:
    st.subheader("Health / Ping Test")
    url = st.text_input("Ping URL", value="https://api.github.com")
    c1, c2 = st.columns(2)
    with c1:
        if st.button("핑 1회"):
            st.session_state.last_ping = do_ping(url)
    with c2:
        if st.button("클리어"):
            st.session_state.last_ping = {}
    st.write("최근 결과:", st.session_state.last_ping)
