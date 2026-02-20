from pydantic import BaseModel
from typing import Dict
import pathlib

class PromptTemplate(BaseModel):
    task_dict: Dict[str, str] = {
        "annotation": "../prompts/annotation_task_prompt.md",
        "rule_synthesis": "../prompts/rule_synthesis_prompt.md"
    }
    def get_task_system_prompt(self, task_name: str):
        try:
            current_dir = pathlib.Path(__file__).parent.resolve()
            relative_path = self.task_dict.get(task_name)
            
            if not relative_path:
                return "Error: Task not found in dictionary"

            prompt_path = (current_dir / relative_path).resolve()
            
            with open(prompt_path, 'r', encoding='utf-8') as file:
                system_prompt = file.read()
            if len(system_prompt) < 1:
                return "Error: File is empty"
            return system_prompt
        
        except Exception as e:
            return "Error: Task not found"
        
