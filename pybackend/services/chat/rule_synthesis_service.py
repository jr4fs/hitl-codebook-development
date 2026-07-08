from typing import Dict, Any, List
from models.ollama_adapter import registry, configs
from models.rule_synthesis_schema import RuleSynthesisItem, RuleSynthesisLLMOutput
import json
import logging


class RuleSynthesisService:
    def __init__(self):
        self.registry = registry
        self.configs = configs
        self.logger = logging.getLogger("uvicorn.error")

    def send_chat(
        self,
        model_name: str,
        system: str,
        inference_payload: List[RuleSynthesisItem],
        **opts
    ) -> Dict[str, Any]:
        model = self.registry[
            model_name
        ]  # TODO: add check to see if model is present, if not, need to download if it is a valid model name
        payload_dict = [item.dict() for item in inference_payload]
        payload_str = json.dumps(payload_dict, ensure_ascii=False)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": payload_str},
        ]
        # token check, caching, metrics hooks go here
        try:
            response = model.chat(
                messages, format=RuleSynthesisLLMOutput.model_json_schema(), **opts
            )
            response_json = response.json()
            prompt_tokens = response_json.get("prompt_eval_count")
            eval_tokens = response_json.get("eval_count")
            total_tokens = (
                (prompt_tokens or 0) + (eval_tokens or 0)
                if prompt_tokens is not None or eval_tokens is not None
                else 0
            )
            duration_ns = response_json.get("total_duration")
            if duration_ns is None:
                prompt_duration = response_json.get("prompt_eval_duration")
                eval_duration = response_json.get("eval_duration")
                if prompt_duration is not None or eval_duration is not None:
                    duration_ns = (prompt_duration or 0) + (eval_duration or 0)

            if prompt_tokens is not None or eval_tokens is not None:
                duration_ms = (duration_ns / 1e6) if duration_ns else 0.0
                self.logger.info(
                    "ollama usage model=%s prompt_tokens=%s eval_tokens=%s total_tokens=%s duration_ms=%.1f",
                    model_name,
                    prompt_tokens,
                    eval_tokens,
                    total_tokens,
                    duration_ms,
                )
            else:
                self.logger.info(
                    "ollama usage model=%s prompt_tokens=missing eval_tokens=missing",
                    model_name,
                )
            # normalize response text
            model_output = json.loads(response_json["message"]["content"])
            return {
                "success": True,
                "rules": model_output.get("rules", []),
                "model_name": model_name,
            }
        except Exception as e:
            print(
                "rule_synthesis failed model=%s error=%s", model_name, str(e)
            )
            return {"success": False, "rules": [], "model_name": model_name}
