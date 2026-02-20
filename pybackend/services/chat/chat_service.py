from typing import Dict, Any, List, Optional
from models.ollama_adapter import OllamaAdapter, registry, configs
import os
from pathlib import Path
import json

from models.embedding_schemas import Label



class ChatService:
    def __init__(self):
        self.registry = registry
        self.configs = configs

    def send_chat(self, labels: List[Label], task_def:str, model_name: str, system: str, case_notes: str, user_input: Optional[str] = None, **opts) -> Dict[str, Any]:
        model = self.registry[model_name] #TODO: add check to see if model is present, if not, need to download if it is a valid model name
        inference_payload = {
            "labels": [l.dict() for l in labels],
            "case_notes": case_notes,
            "task_definition": task_def,
            "user_input": user_input
        }
        payload_str = json.dumps(inference_payload, ensure_ascii=False)
        messages = [{"role": "system", "content": system}, {"role": "user", "content": payload_str}]
        # token check, caching, metrics hooks go here
        response = model.chat(messages, **opts)
        # normalize response text
        model_output = json.loads(response.json()["message"]["content"])
        return {
            "label": model_output["label"],
            "span_text": model_output["span_text"],
            "reason": model_output["reason"]
                }
