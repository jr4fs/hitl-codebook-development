from pydantic import BaseModel, Field
from typing import List, Optional
import pandas as pd

class Label(BaseModel):
    name: str = Field(..., min_length=1)
    definition: str = Field(..., min_length=1)
    keywords: List[str] = Field(..., min_length=1)

#Main request type that comes in
class EmbedDatasetRequest(BaseModel):
    file_path: str = Field(..., min_length=1)
    text_col: str = Field(..., min_length=1)
    id_col: Optional[str] = None
    split_to_sentences: Optional[bool] = True
    model_name: Optional[str] = None
    device: Optional[str] = None
    labels: List[Label]

class EmbedDatasetResponse(BaseModel):
    success: bool
    
