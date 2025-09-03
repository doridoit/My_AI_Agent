from __future__ import annotations

import os
import base64
import numpy as np
import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.patches import Rectangle

from app.state import get_dataset_df
from app.services.mcp_client import call as mcp_call


def _build_eda_context_from_profile(df: pd.DataFrame, prof: dict | None) -> str:
    try:
        lines = []
        lines.append(f"shape={df.shape[0]}x{df.shape[1]}")
        if prof and isinstance(prof.get("nulls"), dict):
            null_items = sorted(((k, int(v)) for k, v in prof["nulls"].items()), key=lambda x: x[1], reverse=True)
            null_items = [(k, v) for k, v in null_items if v > 0][:5]
            if null_items:
                parts = ", ".join([f"{k}:{v}" for k, v in null_items])
                lines.append(f"nulls_top5: {parts}")
        ns = prof.get("numeric_stats") if prof else None
        if isinstance(ns, dict) and ns:
            top = sorted(ns.items(), key=lambda kv: abs(kv[1].get("std", 0) or 0), reverse=True)[:5]
            items = []
            for col, s in top:
                try:
                    items.append(
                        f"{col}(mean:{s.get('mean'):.3f}, median:{s.get('median'):.3f}, min:{s.get('min'):.3f}, max:{s.get('max'):.3f})"
                    )
                except Exception:
                    continue
            if items:
                lines.append("nums_top5: " + "; ".join(items))
        cc = prof.get("category_counts") if prof else None
        if isinstance(cc, dict) and cc:
            first_keys = list(cc.keys())[:2]
            cat_lines = []
            for k in first_keys:
                try:
                    arr = cc[k][:5]
                    cat_lines.append(f"{k}: " + ", ".join([f"{a[0]}:{a[1]}" for a in arr]))
                except Exception:
                    continue
            if cat_lines:
                lines.append("cats: " + " | ".join(cat_lines))
        # UI parts
        ui_parts = []
        eng = st.session_state.get("eda_chart_engine")
        if eng:
            ui_parts.append(f"engine={eng}")
        foc = st.session_state.get("eda_focus_cols")
        if isinstance(foc, (list, tuple)) and foc:
            ui_parts.append("focus_cols=[" + ",".join(map(str, list(foc)[:12])) + "]")
        oc = st.session_state.get("eda_outlier_col")
        ot = st.session_state.get("eda_outlier_thr")
        if oc is not None and ot is not None:
            ui_parts.append(f"outlier(col={oc},|z|={float(ot):.2f})")
        pcb = st.session_state.get("eda_pca_color_by")
        if pcb and pcb != "(없음)":
            ui_parts.append(f"pca_color_by={pcb}")
        if ui_parts:
            lines.append("UI: " + "; ".join(ui_parts))
        return "\n".join(lines)
    except Exception:
        return f"shape={df.shape[0]}x{df.shape[1]}"


def render():
    st.subheader("EDA — 탐색적 데이터 분석")
    # UI options
    ui1, ui2 = st.columns(2)
    with ui1:
        st.toggle("Dark mode", key="eda_dark_mode", value=st.session_state.get("eda_dark_mode", False))
    with ui2:
        st.slider("Font scale", 0.8, 1.6, st.session_state.get("eda_font_scale", 1.0), 0.05, key="eda_font_scale")
    df = get_dataset_df()
    if df is None:
        st.warning("CSV 데이터셋이 없습니다. 'Chat & Upload' 탭에서 CSV를 업로드하세요.")
        st.stop()

    st.caption(f"데이터셋: {st.session_state.dataset['name']} · shape: {df.shape[0]} x {df.shape[1]}")

    # Dark mode / Font scale (re-apply here as safety)
    use_dark = bool(st.session_state.get("eda_dark_mode", False))
    font_scale = float(st.session_state.get("eda_font_scale", 1.0))
    try:
        plt.style.use('dark_background' if use_dark else 'default')
    except Exception:
        pass
    sns.set_theme(style=('darkgrid' if use_dark else 'whitegrid'))
    try:
        sns.set_context("talk", font_scale=font_scale)
    except Exception:
        pass

    # Top KPIs
    k1, k2, k3 = st.columns(3)
    with k1:
        st.metric("행(Row)", f"{len(df):,}")
    with k2:
        st.metric("열(Columns)", f"{len(df.columns):,}")
    with k3:
        st.metric("결측치(Cells)", f"{int(df.isna().sum().sum()):,}")

    # Summary expander under KPI
    with st.expander("🧾 요약 카드 / 🧮 요약 통계", expanded=False):
        try:
            from modules.processing.eda import quick_summary, summary_to_cards
            summary = quick_summary(df)
            try:
                cards = summary_to_cards(summary)
                st.markdown("요약 카드")
                for card in cards:
                    st.markdown(f"**{card.get('title','')}**")
                    body = card.get('body')
                    if isinstance(body, (list, dict)):
                        st.json(body)
                    else:
                        st.write(body)
            except Exception:
                st.markdown("요약 통계")
                st.write(summary)
        except Exception:
            st.markdown("기본 통계 (describe)")
            try:
                st.write(df.describe(include='all').transpose())
            except Exception:
                st.write(df.describe().transpose())

    # Split view: left (EDA), right (chat)
    colL, colR = st.columns([2, 1])

    with colL:
        st.markdown("#### 🚀 고급 EDA (MCP 연동)")
        eda_resp = None
        csv_bytes = st.session_state.dataset.get("bytes")
        if mcp_call and csv_bytes:
            try:
                payload = {"csv_b64": base64.b64encode(csv_bytes).decode("utf-8"), "max_pca_points": 1500}
                with st.spinner("서버에서 EDA 프로파일 계산 중..."):
                    eda_resp = mcp_call("ai.agent.data_tools/eda_profile", payload)
            except Exception:
                eda_resp = None

        # Missingness chart
        with st.expander("결측치 분포 (열별)", expanded=False):
            try:
                nulls = (eda_resp.get("nulls") if (eda_resp and isinstance(eda_resp, dict)) else None)
                if not isinstance(nulls, dict):
                    nulls = df.isna().sum().astype(int).to_dict()
                miss_items = [(k, int(v)) for k, v in nulls.items()]
                miss_items = [(k, v) for k, v in miss_items if v > 0]
                if miss_items:
                    miss_df = pd.DataFrame(miss_items, columns=["column", "missing"]).sort_values("missing", ascending=False)
                    try:
                        import altair as alt
                        chart = alt.Chart(miss_df).mark_bar().encode(
                            x=alt.X("missing:Q", title="결측치 개수"),
                            y=alt.Y("column:N", sort='-x', title="컬럼"),
                            tooltip=["column", "missing"],
                        ).properties(height=max(220, 20*len(miss_df)), width=700)
                        st.altair_chart(chart, use_container_width=True)
                    except Exception:
                        fig, ax = plt.subplots(figsize=(8, max(3, len(miss_df)*0.25)))
                        sns.barplot(x=miss_df["missing"], y=miss_df["column"], ax=ax, color="#a7c7e7")
                        ax.set_xlabel("결측치 개수")
                        ax.set_ylabel("컬럼")
                        st.pyplot(fig, clear_figure=True)
                else:
                    st.success("결측치가 없습니다.")
            except Exception as e:
                st.info(f"결측치 차트 생성 실패: {e}")

        # Numeric stats visuals
        num_df = df.select_dtypes(include=["number"])
        if not num_df.empty:
            st.markdown("#### 📏 컬럼 범위·중앙값·IQR")
            try:
                if eda_resp and eda_resp.get("numeric_stats"):
                    stats_df = pd.DataFrame.from_dict(eda_resp["numeric_stats"], orient="index")
                else:
                    stats_df = pd.DataFrame({
                        "min": num_df.min(),
                        "q1": num_df.quantile(0.25),
                        "median": num_df.median(),
                        "q3": num_df.quantile(0.75),
                        "max": num_df.max(),
                        "mean": num_df.mean(),
                        "std": num_df.std(ddof=1),
                    })
                stats_df = stats_df.replace([np.inf, -np.inf], np.nan).dropna()
                top_cols = stats_df["std"].sort_values(ascending=False).head(12).index.tolist()
                st.session_state["eda_focus_cols"] = list(map(str, top_cols))
                s = stats_df.loc[top_cols].astype(float)

                engine = st.radio(
                    "차트 엔진",
                    ["Altair(인터랙티브)", "Matplotlib(정적)"],
                    index=0,
                    horizontal=True,
                    key="eda_chart_engine",
                )
                if engine.startswith("Altair"):
                    try:
                        import altair as alt
                        disp = s.copy().reset_index().rename(columns={"index": "column"})
                        base = alt.Chart(disp).encode(y=alt.Y("column:N", sort=top_cols))
                        rule = base.mark_rule(color="#94A3B8", strokeWidth=6).encode(x="min:Q", x2="max:Q")
                        bar = base.mark_bar(color="#34D399", opacity=0.9, height=10).encode(x="q1:Q", x2="q3:Q")
                        med_pt = base.mark_point(filled=True, color="#0EA5E9", size=70).encode(x="median:Q")
                        mean_pt = base.mark_point(filled=True, color="#F59E0B", size=50, opacity=0.9).encode(x="mean:Q")
                        st.altair_chart((rule + bar + med_pt + mean_pt).properties(width=800, height=max(250, 26*len(top_cols))), use_container_width=True)
                    except Exception:
                        engine = "Matplotlib(정적)"

                if engine.startswith("Matplotlib"):
                    fig, ax = plt.subplots(figsize=(10, max(4.5, len(top_cols) * 0.45)))
                    for i, col in enumerate(top_cols):
                        mn, q1, med, q3, mx = s.loc[col, ["min", "q1", "median", "q3", "max"]].astype(float)
                        ax.plot([mn, mx], [i, i], color="#CBD5E1", linewidth=6, solid_capstyle="round")
                        ax.add_patch(Rectangle((q1, i - 0.18), max(q3 - q1, 1e-12), 0.36, color="#A7F3D0", alpha=0.9))
                        ax.scatter([med], [i], color="#0EA5E9", s=35, zorder=3)
                    ax.set_yticks(range(len(top_cols)))
                    ax.set_yticklabels(top_cols)
                    ax.set_xlabel("값")
                    ax.set_ylabel("컬럼")
                    ax.set_title("범위(선) · IQR(박스) · 중앙값(점)")
                    st.pyplot(fig, clear_figure=True)

                fig2, ax2 = plt.subplots(figsize=(10, 4))
                plot_df = s[["mean", "median"]].reset_index().melt(id_vars="index", var_name="stat", value_name="value")
                plot_df.rename(columns={"index": "column"}, inplace=True)
                sns.barplot(data=plot_df, x="column", y="value", hue="stat", ax=ax2, palette=["#60A5FA", "#F59E0B"])
                ax2.set_xlabel("컬럼")
                ax2.set_ylabel("값")
                ax2.set_title("평균 vs 중앙값")
                ax2.tick_params(axis='x', rotation=45)
                st.pyplot(fig2, clear_figure=True)
            except Exception as e:
                st.info(f"수치 요약 차트 생성 실패: {e}")

            with st.expander("박스플롯 (상위 분산 컬럼)", expanded=False):
                try:
                    std_rank = num_df.std(numeric_only=True).sort_values(ascending=False).head(8).index
                    top_for_box = num_df[std_rank]
                    fig3, ax3 = plt.subplots(figsize=(10, 4.5))
                    sns.boxplot(data=top_for_box, orient="h", ax=ax3, color="#D1FAE5")
                    ax3.set_title("분포 요약 — 박스플롯")
                    st.pyplot(fig3, clear_figure=True)
                except Exception as e:
                    st.info(f"박스플롯 생성 실패: {e}")

            with st.expander("Z-score 이상치 인스펙터", expanded=False):
                try:
                    col = st.selectbox("컬럼 선택", options=list(num_df.columns), key="eda_outlier_col")
                    thr = st.slider("임계값 |z|", 2.0, 6.0, 3.0, 0.5, key="eda_outlier_thr")
                    s1 = num_df[col]
                    mean_v, std_v = float(s1.mean()), float(s1.std(ddof=1))
                    if std_v and std_v > 0:
                        z = (s1 - mean_v) / std_v
                        mask = z.abs() > thr
                        st.write(f"이상치 개수: {int(mask.sum())}")
                        st.dataframe(df.loc[mask].head(200))
                    else:
                        st.info("표준편차가 0이어서 Z-score를 계산할 수 없습니다.")
                except Exception as e:
                    st.info(f"이상치 인스펙터 오류: {e}")

        with st.expander("PCA 2D 투영 (수치형)", expanded=False):
            try:
                if eda_resp and eda_resp.get("pca2d") and isinstance(eda_resp["pca2d"], dict) and not eda_resp["pca2d"].get("error"):
                    p = eda_resp["pca2d"]
                    x, y, ridx = p.get("x", []), p.get("y", []), p.get("row_indices", [])
                    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
                    color_by = None
                    if cat_cols:
                        color_by = st.selectbox("색상 기준(선택)", ["(없음)"] + cat_cols, index=0, key="eda_pca_color_by")
                        if color_by == "(없음)":
                            color_by = None
                    evr = p.get("explained_variance_ratio", [None, None])
                    try:
                        import altair as alt
                        data = pd.DataFrame({"x": x, "y": y, "row_idx": ridx})
                        if color_by:
                            data[color_by] = df.iloc[ridx][color_by].astype(str).fillna("<NA>").values
                        pts = alt.Chart(data).mark_circle(size=40, opacity=0.75).encode(
                            x=alt.X("x:Q", title=f"PC1 ({evr[0]*100:.1f}% var)" if evr and evr[0] is not None else "PC1"),
                            y=alt.Y("y:Q", title=f"PC2 ({evr[1]*100:.1f}% var)" if evr and evr[1] is not None else "PC2"),
                            tooltip=["row_idx"] + ([color_by] if color_by else []),
                            color=(alt.Color(color_by) if color_by else alt.value("#7C3AED")),
                        ).properties(width=650, height=480)
                        st.altair_chart(pts, use_container_width=True)
                    except Exception:
                        fig4, ax4 = plt.subplots(figsize=(7.5, 6))
                        if color_by:
                            colors = df.iloc[ridx][color_by].astype(str).fillna("<NA>")
                            uniq = colors.unique().tolist()
                            palette = sns.color_palette(n_colors=min(10, len(uniq)))
                            color_map = {v: palette[i % len(palette)] for i, v in enumerate(uniq)}
                            for v in uniq:
                                mask = (colors == v).values
                                ax4.scatter(np.array(x)[mask], np.array(y)[mask], s=12, color=color_map[v], alpha=0.7, label=v)
                            ax4.legend(fontsize=8, ncol=2, frameon=False)
                        else:
                            ax4.scatter(x, y, s=12, alpha=0.7, color="#7C3AED")
                        ax4.set_xlabel(f"PC1 ({evr[0]*100:.1f}% var)" if evr and evr[0] is not None else "PC1")
                        ax4.set_ylabel(f"PC2 ({evr[1]*100:.1f}% var)" if evr and evr[1] is not None else "PC2")
                        ax4.set_title("PCA 2D — 수치형 패턴 보기")
                        st.pyplot(fig4, clear_figure=True)
                else:
                    st.info("PCA를 계산할 수 없거나 수치형 열이 부족합니다.")
            except Exception as e:
                st.info(f"PCA 차트 생성 실패: {e}")

    with colR:
        st.markdown("#### 💬 EDA 챗봇")
        for m in st.session_state.eda_chat:
            st.chat_message(m["role"]).write(m["content"])
        if user_msg := st.chat_input("EDA 관련 질문을 입력하세요…", key="eda_chat_input"):
            st.session_state.eda_chat.append({"role": "user", "content": user_msg})
            with st.spinner("AI가 분석 중입니다..."):
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
                    if st.session_state.dataset.get("bytes") else None
                )
                eda_profile = None
                if st.session_state.dataset.get("bytes"):
                    try:
                        _payload = {"csv_b64": base64.b64encode(st.session_state.dataset["bytes"]).decode("utf-8"), "max_pca_points": 600}
                        eda_profile = mcp_call("ai.agent.data_tools/eda_profile", _payload)
                    except Exception:
                        eda_profile = None
                eda_context = _build_eda_context_from_profile(df, eda_profile)
                payload = {
                    "user_query": user_msg,
                    "csv_data_b64": csv_data_b64,
                    "rag_index_exists": rag_index_exists,
                    "index_dir": index_dir,
                    "eda_context": eda_context,
                }
                try:
                    response = mcp_call("ai.agent.core_logic/chat_with_context", payload)
                    reply = response.get("answer", "오류: 답변을 받지 못했습니다.")
                except Exception as e:
                    reply = f"서버 통신 중 오류가 발생했습니다: {e}"
            st.session_state.eda_chat.append({"role": "assistant", "content": reply})
            st.rerun()
