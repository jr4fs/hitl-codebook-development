from __future__ import annotations
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Dict, Any, List, Optional
from .anonymize import apply_pipeline
from .rules import build_rules
import pandas as pd
import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[3]
CONFIG_PATH = Path(__file__).with_name("config.yaml")


def _resolve_resource_path(path_value: str | None) -> str | None:
    if not path_value:
        return None
    path = Path(path_value)
    if path.is_absolute():
        return str(path)
    return str(PROJECT_ROOT / path)


def _load_config() -> Dict[str, Any]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    resources = cfg.get("resources", {})

    # Prefer shared_uploads/anonymize/names.csv when present
    shared_names = PROJECT_ROOT / "shared_uploads" / "anonymize" / "names.csv"
    if shared_names.is_file():
        resources["names_structured_path"] = str(shared_names)
        resources["names_list_path"] = str(shared_names)

    # Resolve any remaining relative paths
    if resources.get("names_structured_path"):
        resources["names_structured_path"] = _resolve_resource_path(resources["names_structured_path"])
    if resources.get("names_list_path"):
        resources["names_list_path"] = _resolve_resource_path(resources["names_list_path"])

    cfg["resources"] = resources
    return cfg


def _apply_overrides(
    cfg: Dict[str, Any],
    overrides: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """Merge DB config overrides into the loaded config."""
    if not overrides:
        return cfg

    rules = cfg.get("rules", [])

    # Apply toggle overrides to specific rule types
    for rule in rules:
        rule_type = rule.get("type")

        if rule_type == "age" and overrides.get("ageEnabled") is not None:
            rule["enable"] = overrides["ageEnabled"]

        elif rule_type == "regex":
            # Apply per-pattern enable flags
            patterns = rule.get("patterns", [])
            for p in patterns:
                rep = p.get("replacement", "")
                if rep == "EMAIL" and overrides.get("emailEnabled") is not None:
                    p["enable"] = overrides["emailEnabled"]
                elif rep == "PHONE" and overrides.get("phoneEnabled") is not None:
                    p["enable"] = overrides["phoneEnabled"]

        elif rule_type == "pronoun" and overrides.get("pronounEnabled") is not None:
            rule["enable"] = overrides["pronounEnabled"]

        elif rule_type == "phrase_protect" and overrides.get("phrases") is not None:
            # Merge user phrases with defaults (user phrases take precedence)
            user_phrases = overrides["phrases"]
            if isinstance(user_phrases, list) and len(user_phrases) > 0:
                rule["phrases"] = user_phrases

        elif rule_type == "presidio_filtered":
            # Pass skip words
            if overrides.get("skipWords") is not None:
                user_skip_words = overrides["skipWords"]
                if isinstance(user_skip_words, list) and len(user_skip_words) > 0:
                    rule["skip_words"] = user_skip_words
            
            # Build skip_entities based on disabled toggles
            skip_entities = rule.get("skip_entities", [])
            if overrides.get("emailEnabled") is False:
                skip_entities.append("EMAIL_ADDRESS")
            if overrides.get("phoneEnabled") is False:
                skip_entities.append("PHONE_NUMBER")
            if overrides.get("ageEnabled") is False:
                # When age is off, skip NUMBER/DATE that might catch age values
                skip_entities.extend(["NUMBER", "DATE", "DATE_TIME"])
            if skip_entities:
                rule["skip_entities"] = skip_entities

    cfg["rules"] = rules
    return cfg


def get_config_defaults() -> Dict[str, Any]:
    """
    Return the default config values parsed from config.yaml.
    This is used by the Node.js backend to get defaults instead of hardcoding.
    """
    cfg = _load_config()
    rules = cfg.get("rules", [])

    # Extract toggle defaults from rules
    age_enabled = True
    email_enabled = True
    phone_enabled = True
    pronoun_enabled = False
    phrases = []
    skip_words = []

    for rule in rules:
        rule_type = rule.get("type")

        if rule_type == "age":
            age_enabled = rule.get("enable", True)

        elif rule_type == "regex":
            for p in rule.get("patterns", []):
                rep = p.get("replacement", "")
                if rep == "EMAIL":
                    email_enabled = p.get("enable", True)
                elif rep == "PHONE":
                    phone_enabled = p.get("enable", True)

        elif rule_type == "pronoun":
            pronoun_enabled = rule.get("enable", False)

        elif rule_type == "phrase_protect":
            for phrase in rule.get("phrases", []):
                phrases.append({
                    "text": phrase.get("text", ""),
                    "replacement": phrase.get("replacement", "")
                })

        elif rule_type == "presidio_filtered":
            skip_words = rule.get("skip_words", [])

    return {
        "ageEnabled": age_enabled,
        "emailEnabled": email_enabled,
        "phoneEnabled": phone_enabled,
        "pronounEnabled": pronoun_enabled,
        "phrases": phrases,
        "skipWords": skip_words
    }


def _get_rules(overrides: Optional[Dict[str, Any]] = None) -> List[Any]:
    """Build rules with optional overrides from DB config."""
    cfg = _load_config()
    cfg = _apply_overrides(cfg, overrides)
    options = cfg.get("options", {})
    resources = cfg.get("resources", {})
    rules_cfg = cfg.get("rules", [])
    return build_rules(rules_cfg, options, resources)


def anonymize_csv_bytes(
    csv_bytes: bytes,
    text_columns: List[str],
    config_overrides: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Anonymize CSV data with optional config overrides.
    
    Args:
        csv_bytes: Raw CSV file content
        text_columns: List of column names to anonymize
        config_overrides: Optional dict with DB config overrides
    """
    df = pd.read_csv(BytesIO(csv_bytes))
    if not any(col in df.columns for col in text_columns):
        return csv_bytes

    rules = _get_rules(config_overrides)
    anonymized_suffix = "_ANONYMIZED"
    out_df = apply_pipeline(
        df,
        text_columns,
        rules,
        replace_columns=False,
        anonymized_suffix=anonymized_suffix
    )
    for col in text_columns:
        anonymized_col = f"{col}{anonymized_suffix}"
        if anonymized_col in out_df.columns and col in out_df.columns:
            out_df = out_df.drop(columns=[col])
    csv_text = out_df.to_csv(index=False)
    return csv_text.encode("utf-8")
