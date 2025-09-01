import os
from tenacity import retry, wait_exponential, stop_after_attempt

MODELS = {
    "gemini-1.5-pro": {"vendor": "google", "max_tokens": 8192},
    # "gpt-4o-mini": {"vendor": "openai", "max_tokens": 8192},  # reserved (optional)
}

def require_env(var: str):
    v = os.getenv(var)
    if not v:
        raise RuntimeError(f"Missing env: {var}")
    return v

@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3))
def invoke(model: str, parts: list[str], **kwargs) -> dict:
    meta = MODELS.get(model)
    if not meta:
        raise ValueError(f"Unknown model: {model}")
    vendor = meta["vendor"]

    if vendor == "google":
        import google.generativeai as genai  # pip install google-generativeai
        api_key = require_env("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)
        model_name = model or os.getenv("GOOGLE_MODEL", "gemini-1.5-pro")
        gm = genai.GenerativeModel(model_name)
        resp = gm.generate_content(parts, **{k: v for k, v in kwargs.items() if v is not None})
        text = getattr(resp, "text", "") or (
            resp.candidates[0].content.parts[0].text if getattr(resp, "candidates", None) else ""
        )
        return {"text": (text.strip() if text else ""), "usage": {}}

    # Future: OpenAI path (disabled for now)
    # elif vendor == "openai":
    #     from openai import OpenAI
    #     api_key = require_env("OPENAI_API_KEY")
    #     client = OpenAI(api_key=api_key)
    #     resp = client.chat.completions.create(model=model, messages=messages, temperature=kwargs.get("temperature", 0.2))
    #     return {"text": resp.choices[0].message.content.strip(), "usage": resp.usage}

    raise ValueError(f"Unsupported vendor: {vendor}")
