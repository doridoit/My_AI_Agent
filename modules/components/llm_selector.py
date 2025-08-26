import os
from tenacity import retry, wait_exponential, stop_after_attempt

MODELS = {
    "gpt-4o-mini": {"vendor": "openai", "max_tokens": 8192},
    "gemini-1.5-pro": {"vendor": "google", "max_tokens": 8192},
}

def require_env(var: str):
    v = os.getenv(var)
    if not v:
        raise RuntimeError(f"Missing env: {var}")
    return v

@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3))
def invoke(model: str, messages: list[dict], **kwargs) -> dict:
    meta = MODELS.get(model)
    if not meta:
        raise ValueError(f"Unknown model: {model}")
    vendor = meta["vendor"]
    # P0: 실제 API 호출은 후속 P1에서 구현
    return {"text": "(P0) LLM 연결 전 — echo only.", "usage": {}}
