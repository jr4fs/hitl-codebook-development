from pydantic import BaseModel, Field
from typing import List

class RuleSynthesisItem(BaseModel):
    sample_text: str = Field(..., min_length=1)
    ai_labels: List[str] = Field(..., min_length=1)
    ai_reasoning: str = Field(..., min_length=1)
    ai_span_text: str = Field(..., min_length=1)
    ground_truth_labels: List[str] = Field(..., min_length=1)
    user_feedback: str = Field(..., min_length=1)
    user_label_feedback: bool
    user_span_feedback: bool
    user_reasoning_feedback: bool

class RuleSynthesisRequest(BaseModel):
    payload: List[RuleSynthesisItem] = Field(..., min_length=1)
    task_type: str = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)

class RuleSynthesisResponse(BaseModel):
    success: bool
    rules: List[str] = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)

class RuleSynthesisLLMOutput(BaseModel):
    rules: List[str] = Field(..., min_length=1)