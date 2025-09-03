import os
import streamlit as st
from dotenv import load_dotenv

# Optional MCP client (used by Chat page)
try:
    from app.services.mcp_client import call as mcp_call
except Exception:
    mcp_call = None

# Env + session state
load_dotenv()
from app.state import ensure_session_state as _init_session_state, clear_dataset, clear_knowledge_base
_init_session_state()

# Page config
st.set_page_config(page_title="My_AI_Agent", page_icon="✨", layout="wide")
st.title("✨ AI Agent Proto")

# Header (health badges) + sidebar CSS
CORE_LOGIC_SERVER_URL = os.getenv("CORE_LOGIC_SERVER_URL", "http://localhost:8001")
DATA_TOOLS_SERVER_URL = os.getenv("DATA_TOOLS_SERVER_URL", "http://localhost:8002")
from app.header import render_health_badges
from app.theme import inject_sidebar_css
render_health_badges(CORE_LOGIC_SERVER_URL, DATA_TOOLS_SERVER_URL)
inject_sidebar_css()

# Global status (CSV / Knowledge base)
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

# Sidebar navigation
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

# Routing to pages
if current_tab == "Chat":
    from app.pages.chat_page import render as render_chat
    render_chat(mcp_call)
    st.stop()
elif current_tab == "EDA":
    from app.pages.eda_page import render as render_eda
    render_eda()
    st.stop()
elif current_tab == "RAG":
    from app.pages.rag_page import render as render_rag
    render_rag()
    st.stop()
elif current_tab == "Anomaly":
    from app.pages.anomaly_page import render as render_anom
    render_anom()
elif current_tab == "Settings":
    from app.pages.settings_page import render as render_settings
    render_settings()

