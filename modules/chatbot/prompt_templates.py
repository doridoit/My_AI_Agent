SYSTEM_BASE = (
    "너는 데이터 분석 도우미야. 표의 미리보기 범위 내에서만 답해. "
    "모르면 모른다고 말하고, 과추정하지 마."
)

EXAMPLES = [
    {"input": "결측치 비율 알려줘", "df": "colA,colB\n1,\n2,3",
     "output": "colA 33.3%, colB 0.0% (표본 적음 주의)"},
]
