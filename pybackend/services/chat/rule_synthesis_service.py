from typing import Dict, Any, List
from models.ollama_adapter import registry, configs
from models.rule_synthesis_schema import RuleSynthesisItem
import json

class RuleSynthesisService:
    def __init__(self):
        self.registry = registry
        self.configs = configs

    def send_chat(self, model_name: str, system: str, inference_payload: List[RuleSynthesisItem], **opts) -> Dict[str, Any]:
        model = self.registry[model_name] #TODO: add check to see if model is present, if not, need to download if it is a valid model name
        payload_dict = [item.dict() for item in inference_payload]
        payload_str = json.dumps(payload_dict, ensure_ascii=False)
        messages = [{"role": "system", "content": system}, {"role": "user", "content": payload_str}]
        # token check, caching, metrics hooks go here
        try:
            response = model.chat(messages, **opts)
            # normalize response text
            model_output = json.loads(response.json()["message"]["content"])
            return {
                "success": True,
                "rules": model_output["rules"],
                "model_name": model_name
                }
        except Exception as e:
            return {
                "success": False,
                "rules": [],
                "model_name": model_name
            }