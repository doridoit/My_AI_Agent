from __future__ import annotations

import streamlit as st


def render():
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

