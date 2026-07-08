import os


def is_ui_dev_mode() -> bool:
    return os.getenv("APP_MODE", "").strip().upper() == "UI_DEV"
