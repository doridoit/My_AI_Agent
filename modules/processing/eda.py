import pandas as pd

def require_columns(df: pd.DataFrame, cols: list[str]):
    missing = [c for c in cols if c not in df.columns]
    if missing:
        return False, f"누락 컬럼: {missing} / 사용 가능: {list(df.columns)}"
    return True, None

def quick_summary(df: pd.DataFrame) -> dict:
    n_rows, n_cols = df.shape
    nulls = df.isna().sum().to_dict()
    dtypes = df.dtypes.astype(str).to_dict()
    dup_cnt = int(df.duplicated().sum())
    num_cols = df.select_dtypes(include=["number"]).columns[:30]
    corr = df[num_cols].corr().round(3).to_dict() if len(num_cols) > 1 else {}
    return {
        "shape": {"rows": int(n_rows), "cols": int(n_cols)},
        "nulls": nulls,
        "dtypes": dtypes,
        "duplicates": dup_cnt,
        "corr(num<=30)": corr,
    }
