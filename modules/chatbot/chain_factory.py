from .prompt_templates import SYSTEM_BASE, EXAMPLES

def build_prompt(user_q: str, df_preview: str) -> str:
    shots = "\n\n".join([
        f"[Q]\n{e['input']}\n[DF]\n{e['df']}\n[A]\n{e['output']}" for e in EXAMPLES
    ])
    return f"{SYSTEM_BASE}\n\n[예시]\n{shots}\n\n[질문]\n{user_q}\n[DF]\n{df_preview}\n[답변]"
