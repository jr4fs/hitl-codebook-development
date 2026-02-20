# io_adapters.py

import os
import pandas as pd
from typing import Dict, Any


def _normalize_csv_options(opts: Dict[str, Any]) -> Dict[str, Any]:
    """Map user-friendly options to pandas kwargs."""
    opts = dict(opts or {})
    # pandas uses 'sep', not 'delimiter'
    if "delimiter" in opts and "sep" not in opts:
        opts["sep"] = opts.pop("delimiter")
    return opts


def load_frame(input_cfg: Dict[str, Any]) -> pd.DataFrame:
    path = input_cfg["path"]
    typ = input_cfg.get("type", "csv").lower()
    if typ == "csv":
        opts = _normalize_csv_options(input_cfg.get("csv_options"))
        return pd.read_csv(path, **opts)
    if typ in {"jsonl", "json-lines"}:
        return pd.read_json(path, lines=True)
    if typ == "xlsx":
        return pd.read_excel(path)
    raise ValueError(f"Unsupported input type: {typ}")


def write_frame(df: pd.DataFrame, input_cfg: Dict[str, Any], output_cfg: Dict[str, Any]) -> str:
    in_path = input_cfg["path"]
    out_path = output_cfg.get("path")
    out_type = output_cfg.get("type", "auto").lower()

    if out_type == "auto":
        ext = os.path.splitext(in_path)[1].lower()
        if not out_path:
            base = os.path.splitext(in_path)[0]
            out_path = f"{base}_anonymized{ext}"
        out_type = {".csv": "csv", ".jsonl": "jsonl", ".json": "jsonl", ".xlsx": "xlsx"}.get(ext, "csv")

    if not out_path:
        base, _ = os.path.splitext(in_path)
        out_path = f"{base}_anonymized.{out_type}"

    if out_type == "csv":
        opts = _normalize_csv_options(output_cfg.get("csv_options"))
        df.to_csv(out_path, index=False, **opts)
    elif out_type == "jsonl":
        df.to_json(out_path, orient="records", lines=True, force_ascii=False)
    elif out_type == "xlsx":
        df.to_excel(out_path, index=False)
    else:
        raise ValueError(f"Unsupported output type: {out_type}")
    return out_path
