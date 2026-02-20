from pydantic import BaseModel, Field
from typing import List, Optional


class PhraseMapping(BaseModel):
    text: str
    replacement: str


class AnonymizeConfigOverrides(BaseModel):
    """Config overrides passed from Node.js backend (stored in DB)"""
    ageEnabled: Optional[bool] = None
    emailEnabled: Optional[bool] = None
    pronounEnabled: Optional[bool] = None
    phrases: Optional[List[PhraseMapping]] = None
    skipWords: Optional[List[str]] = None
