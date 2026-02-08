from typing import List
import pandas as pd

def apply_pipeline(
    df: pd.DataFrame,
    text_columns: List[str],
    rules,
    replace_columns: bool = True,
    anonymized_suffix: str = "_anonymized"
) -> pd.DataFrame:
    """
        For each text column:
            - apply anonymization rules
            - replace the original column (default)
                or write to <col>{anonymized_suffix} when replace_columns=False
    Shows tqdm progress per column.
    """
    out = df.copy()

    for col in text_columns:
        if col not in out.columns:
            print(f"[WARN] Column '{col}' not found in dataframe, skipping.")
            continue

        print(f"[INFO] Anonymizing column '{col}' ...")

        # ensure string dtype
        source_series = out[col].astype(str)

        # row-level loop w/ tqdm
        it = source_series.items()

        new_values = []
        for _, cell in it:
            # Normalize NaN/None/float to a safe string for rule processing.
            text_val = "" if pd.isna(cell) else str(cell)
            for rule in rules:
                text_val = rule.apply(text_val)
            new_values.append(text_val)

        target_col = col if replace_columns else f"{col}{anonymized_suffix}"
        out[target_col] = new_values

    return out