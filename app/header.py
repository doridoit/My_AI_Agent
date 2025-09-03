from __future__ import annotations

import time
import requests
import streamlit as st


def _check_health(url: str, timeout: float = 1.5):
    try:
        t0 = time.time()
        r = requests.get(f"{url}/health", timeout=timeout)
        ok = (r.status_code == 200) and bool(r.json().get("ok"))
        return ok, max(0.0, time.time() - t0)
    except Exception:
        return False, None


def _render_badge(name: str, ok: bool, elapsed: float | None):
    status = "ok" if ok else "down"
    if ok and elapsed is not None:
        label = f"{name}: OK ({int(elapsed * 1000)} ms)"
    elif ok:
        label = f"{name}: OK"
    else:
        label = f"{name}: DOWN"
    st.markdown(f'<span class="badge {status}">{label}</span>', unsafe_allow_html=True)


def render_health_badges(core_url: str, data_url: str):
    hc1, hc2, hc3 = st.columns([1, 1, 0.3])
    core_ok, core_elap = _check_health(core_url)
    data_ok, data_elap = _check_health(data_url)
    with hc1:
        _render_badge("Core (8001)", core_ok, core_elap)
    with hc2:
        _render_badge("Data Tools (8002)", data_ok, data_elap)
    with hc3:
        st.button("🔄 새로고침", help="헬스 상태 새로고침", key="health_refresh")

