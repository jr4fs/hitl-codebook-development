from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import requests
import json

from models.embedding_schemas import Label

class OllamaAdapter(BaseModel):
    model: str
    base:str = "http://localhost:11434"
    
    def chat(self, messages: List[Dict[str,str]], **opts):
        payload = {"model": self.model, "messages": messages, "stream":False, "format": "json", **opts}
        r = requests.post(f"{self.base}/api/chat", json=payload, timeout=180) #TODO: add retry and backoff 
        r.raise_for_status()
        return r

    def info(self) -> Dict[str, Any]:
        return {"model": self.model}

class InferenceRequest(BaseModel):
    labels:  List[Label] = Field(..., min_length=1)
    task_definition: str = Field(..., min_length=1)
    case_notes: str = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)
    user_input: Optional[str] = Field(None, min_length=0)
    task_type: str = Field(..., min_length=1)

class InferenceResponse(BaseModel):
    model_name: str = Field(..., min_length=1)
    label: List[str] = Field(..., min_length=1)
    span_text: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    raw_response: Optional[str] = Field(None, min_length=0)
    task_type: str = Field(..., min_length=1)
    tokens: int
    time: float

class BatchInferenceRequest(BaseModel):
    ground_truth_labels:  List[Label] = Field(..., min_length=1)
    task_definition: str = Field(..., min_length=1)
    case_notes: str = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)
    user_input: Optional[str] = Field(None, min_length=0)
    task_type: str = Field(..., min_length=1)

class BatchInferenceResponse(BaseModel):
    model_name: str = Field(..., min_length=1)
    is_correct: bool
    tokens: int
    time: float

class BatchInferenceSummary(BaseModel):
    results: List[BatchInferenceResponse]
    accuracy: float


registry = {
    "mistral:7b": OllamaAdapter(model="mistral:7b"),
    "gemma3:1b": OllamaAdapter(model="gemma3:1b"),
    "qwen3.5:2b": OllamaAdapter(model="qwen3.5:2b"),
    "qwen:32b": OllamaAdapter(model="qwen:32b"),
    "llama3.3:70b": OllamaAdapter(model="llama3.3:70b")
}

configs = {
    "mistral:7b": {
        "temperature": 0.7,
    },
    "gemma3:1b": {
        "temperature": 0.7,
    },
    "qwen3.5:2b": {
        "temperature": 0.7,
    },
    "qwen:32b": {
        "temperature": 0.7,
    },
    "llama3.3:70b": {
        "temperature": 0.7,
    }
}
