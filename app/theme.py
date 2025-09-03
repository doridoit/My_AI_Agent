from __future__ import annotations

import streamlit as st


def inject_sidebar_css() -> None:
    st.markdown(
        """
        <style>
        /* Hide default radio button circles */
        [data-baseweb="radio"] input[type="radio"] { display: none; }

        /* Sidebar radio label container */
        section[data-testid="stSidebar"] div[role="radiogroup"] > label {
            display: flex; align-items: center; padding: 12px 15px !important;
            margin: 6px 0; border-radius: 12px; border: 1px solid transparent;
            transition: background-color 0.2s, border-color 0.2s; cursor: pointer;
            user-select: none;
        }
        /* Disable selection/drag */
        section[data-testid="stSidebar"] div[role="radiogroup"] > label,
        section[data-testid="stSidebar"] div[role="radiogroup"] > label * {
            -webkit-user-select: none !important; -moz-user-select: none !important;
            -ms-user-select: none !important; user-select: none !important;
            -webkit-user-drag: none !important; -webkit-tap-highlight-color: transparent;
        }
        /* Hover effect */
        section[data-testid="stSidebar"] div[role="radiogroup"] > label:hover { background-color: #f0f2f5; }

        /* Selected item alignment */
        [data-baseweb="radio"] input:checked + div > div { width: 100%; }

        /* Health badge styles */
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px;
                 font-size: 12px; font-weight: 600; border: 1px solid rgba(0,0,0,0.08); }
        .badge.ok { background-color: #e6f4ea; color: #137333; border-color: #13733333; }
        .badge.down { background-color: #fce8e6; color: #a50e0e; border-color: #a50e0e33; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def apply_dark_mode_css(enabled: bool, font_scale: float) -> None:
    if not enabled:
        return
    st.markdown(
        """
        <style>
        .stApp { background-color: #0f172a; color: #e2e8f0; }
        .stMarkdown, .stMetric, .stExpander, .stDataFrame, .stJson { color: #e2e8f0; }
        div[data-testid="stMetricValue"] { color: #e2e8f0 !important; }
        div[data-testid="stMetricDelta"] { color: #93c5fd !important; }
        .badge { filter: brightness(0.9); }
        </style>
        """,
        unsafe_allow_html=True,
    )

