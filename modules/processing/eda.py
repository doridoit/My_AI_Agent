import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

def require_columns(df: pd.DataFrame, cols: list[str]):
    missing = [c for c in cols if c not in df.columns]
    if missing:
        return False, f"누락 컬럼: {missing} / 사용 가능: {list(df.columns)}"
    return True, None

def _numeric_cols(df: pd.DataFrame, limit: int = 30) -> list[str]:
    return list(df.select_dtypes(include=["number"]).columns[:limit])

def quick_summary(df: pd.DataFrame) -> Dict[str, Any]:
    n_rows, n_cols = df.shape
    nulls = df.isna().sum().to_dict()
    dtypes = df.dtypes.astype(str).to_dict()
    dup_cnt = int(df.duplicated().sum())
    num_cols = _numeric_cols(df)
    corr = df[num_cols].corr().round(3).replace({np.nan: None}).to_dict() if len(num_cols) > 1 else {}
    return {
        "shape": {"rows": int(n_rows), "cols": int(n_cols)},
        "nulls": {k: int(v) for k, v in nulls.items()},
        "dtypes": dtypes,
        "duplicates": dup_cnt,
        "corr(num<=30)": corr,
    }

def summary_to_cards(summary: Dict[str, Any]) -> Dict[str, Any]:
    """요약 결과를 카드(metric)용 수치로 변환"""
    rows = summary.get("shape", {}).get("rows", 0)
    cols = summary.get("shape", {}).get("cols", 0)
    null_total = sum(summary.get("nulls", {}).values()) if summary.get("nulls") else 0
    dtypes = summary.get("dtypes", {})
    num_cols = len([k for k, v in dtypes.items() if "int" in v or "float" in v or v == "number"])
    dup = summary.get("duplicates", 0)
    return {
        "rows": rows,
        "cols": cols,
        "num_cols": num_cols,
        "nulls": null_total,
        "duplicates": dup,
    }

def plot_corr(df: pd.DataFrame, limit: int = 30):
    """상관행렬 히트맵 matplotlib Figure 반환 (수치형 2열 이상일 때만)"""
    import matplotlib.pyplot as plt

    cols = _numeric_cols(df, limit=limit)
    if len(cols) < 2:
        return None

    corr = df[cols].corr()
    fig = plt.figure(figsize=(min(0.6*len(cols)+3, 12), min(0.6*len(cols)+3, 12)))
    ax = plt.gca()
    im = ax.imshow(corr, vmin=-1, vmax=1)
    ax.set_xticks(range(len(cols)))
    ax.set_yticks(range(len(cols)))
    ax.set_xticklabels(cols, rotation=45, ha="right")
    ax.set_yticklabels(cols)
    ax.set_title("Correlation (numeric ≤ 30)")
    # 값 라벨 일부만 표시(과밀 방지)
    if len(cols) <= 12:
        for i in range(len(cols)):
            for j in range(len(cols)):
                ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=8, color="black")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.tight_layout()
    return fig
