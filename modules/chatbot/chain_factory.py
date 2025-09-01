import os
from typing import Optional
import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# 프롬프트는 별도 파일에서 가져옵니다 (중복 정의 X)
try:
    from .prompt_templates import SYSTEM_BASE  # 프로젝트에 이미 존재
except Exception:
    SYSTEM_BASE = (
        "당신은 한국어로 답변하는 데이터 분석 어시스턴트입니다. "
        "데이터프레임 컨텍스트(행/열 수, dtypes, 미리보기)를 활용해 간결하고 논리적으로 답하세요."
    )

REQUIRED_KEYS = ["GOOGLE_API_KEY"]


def create_gemini_chat_chain(model: Optional[str] = None, temperature: Optional[float] = None) -> ChatGoogleGenerativeAI: # ✨ 변경된 부분: temperature 매개변수 추가
    """
    .env에서 GOOGLE_API_KEY를 불러와 Gemini Chat 모델을 생성합니다.
    model: 환경변수 GOOGLE_MODEL 우선, 기본값 'gemini-1.5-flash'
    """
    load_dotenv()  # 안전하게 호출 (중복 호출 무해)
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY가 설정되지 않았습니다. .env에 키를 넣어주세요.")
    model_name = model or os.getenv("GOOGLE_MODEL") or "gemini-1.5-flash"
    
    # temperature 매개변수 추가
    kwargs = {}
    if temperature is not None:
        kwargs["temperature"] = temperature
        
    return ChatGoogleGenerativeAI(model=model_name, google_api_key=google_api_key, **kwargs) # ✨ 변경된 부분: kwargs 전달


def get_model_names():
    """Return (primary, fallback) model names after env/default resolution."""
    primary = os.getenv("GOOGLE_MODEL") or "gemini-1.5-flash"
    fallback = os.getenv("GOOGLE_FALLBACK_MODEL", "gemini-1.5-flash")
    return primary, fallback


def _build_data_context(df: Optional[pd.DataFrame], max_rows: int = 5) -> str:
    """업로드된 DataFrame을 LLM이 이해하기 쉽게 경량 문자열로 직렬화."""
    if df is None or not isinstance(df, pd.DataFrame) or df.empty:
        return "NO_DATAFRAME"
    head_csv = df.head(max_rows).to_csv(index=False)
    dtypes_line = ", ".join([f"{c}:{str(t)}" for c, t in df.dtypes.items()])
    return f"rows={len(df):,}, cols={len(df.columns):,}\ndtypes={dtypes_line}\npreview_csv=\n{head_csv}"


def _ask_llm(user_msg: str) -> str:
    """
    Chat 탭에서 호출하는 헬퍼.
    - 세션의 공유 데이터셋(st.session_state.dataset.df)을 우선 활용
    - 키가 없거나 LLM 에러면 quick_summary로 우회 응답
    """
    # 공유 데이터셋 우선, 없으면 last_df (하위호환)
    ds = st.session_state.get("dataset", {})
    df = ds.get("df")
    if df is None:
        df = st.session_state.get("last_df")

    # LLM 생성 (키 미설정 시 예외 발생)
    try:
        llm = create_gemini_chat_chain()
    except Exception as e:
        # 우회: 로컬 요약으로 친절히 응답
        if isinstance(df, pd.DataFrame) and not df.empty:
            try:
                from modules.processing.eda import quick_summary
                s = quick_summary(df)
                null_total = sum(s.get("nulls", {}).values()) if s.get("nulls") else 0
                return (
                    f"[LLM 미연결] {e}\n"
                    f"- 행/열: {s['shape']['rows']:,}/{s['shape']['cols']:,}\n"
                    f"- 결측치 합계: {null_total}\n"
                    "환경설정에 GOOGLE_API_KEY를 설정하면 상세 분석이 가능합니다."
                )
            except Exception:
                return f"[LLM 미연결] {e}\n데이터셋 요약에도 실패했습니다."
        return f"[LLM 미연결] {e}\n데이터셋이 없거나 비어 있습니다."

    # 프롬프트 구성 (외부 템플릿 + 데이터 컨텍스트 + 사용자 질문)
    data_ctx = _build_data_context(df)
    prompt = f"{SYSTEM_BASE}\n\nDATAFRAME_CONTEXT:\n{data_ctx}\n\nUSER:\n{user_msg}"

    try:
        resp = llm.invoke(prompt)
        text = getattr(resp, "content", "") or str(resp)
        return text.strip() if text else "[LLM 오류] 응답이 비어 있습니다."
    except Exception as e:
        # LLM 호출 실패 시에도 친절한 우회
        if isinstance(df, pd.DataFrame) and not df.empty:
            try:
                from modules.processing.eda import quick_summary
                s = quick_summary(df)
                null_total = sum(s.get("nulls", {}).values()) if s.get("nulls") else 0
                return (
                    f"[LLM 오류] {e}\n"
                    f"- 행/열: {s['shape']['rows']:,}/{s['shape']['cols']:,}\n"
                    f"- 결측치 합계: {null_total}\n"
                    "키/네트워크를 확인하거나, 질문을 구체화해 주세요."
                )
            except Exception:
                return f"[LLM 오류] {e}\n로컬 요약에도 실패했습니다."
        return f"[LLM 오류] {e}\n데이터셋이 없거나 비어 있습니다."

# 단독 실행 테스트 (옵션)
if __name__ == "__main__":
    try:
        llm = create_gemini_chat_chain()
        print("✅ Gemini 모델 로드 성공")
        demo = llm.invoke("안녕! 서울의 오늘 날씨를 간단히 말해줘.")
        print("샘플 응답:", getattr(demo, "content", demo))
    except Exception as ex:
        print("❌ 초기화 실패:", ex)