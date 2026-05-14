"""
API Routes Module

This module contains all FastAPI route definitions for the Annotation Tool.
Routes are organized by functionality and use dependency injection for services.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse, Response
from typing import List, Optional
from pathlib import Path
import json
import asyncio
import uuid

# Keyed by task_id; holds live progress for in-flight val-evals.
_eval_progress: dict[str, dict] = {}
# Keyed by task_id; holds the run_id of the currently active eval.
# Changing or deleting this entry signals the running eval to abort.
_eval_run_ids: dict[str, str] = {}

VAL_EVAL_CONCURRENCY = 1

from models.embedding_schemas import EmbedDatasetRequest, EmbedDatasetResponse
from models.rule_synthesis_schema import RuleSynthesisRequest, RuleSynthesisResponse
#from services.embedding_service import EmbeddingService
from services.anonymizer.service import anonymize_csv_bytes, get_config_defaults
from models.ollama_adapter import InferenceRequest, InferenceResponse, BatchInferenceRequest, BatchInferenceResponse, BatchInferenceSummary, ValEvalRequest, ValEvalResponse, ValEvalSampleResult
from services.chat.chat_service import ChatService
from models.prompt_templating_model import PromptTemplate
from services.chat.rule_synthesis_service import RuleSynthesisService

embedding_router = APIRouter(prefix="/embedding", tags=["embedding"])
chat_router = APIRouter(prefix="/inference", tags=["inference"])
anonymize_router = APIRouter(prefix="/anonymize", tags=["anonymize"])

@anonymize_router.post("/csv")
async def anonymize_csv(
    file: UploadFile = File(...),
    config: Optional[str] = Form(None)
):
    """
    Anonymize a CSV file with optional config overrides.
    
    Args:
        file: CSV file to anonymize
        config: Optional JSON string with config overrides from DB
    """
    try:
        csv_bytes = await file.read()
        if not csv_bytes:
            raise HTTPException(status_code=400, detail="CSV payload is empty")

        # Parse config overrides if provided
        config_overrides = None
        if config:
            try:
                config_overrides = json.loads(config)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid config JSON")

        anonymized = anonymize_csv_bytes(
            csv_bytes,
            text_columns=["Notes"],
            config_overrides=config_overrides
        )
        return Response(content=anonymized, media_type="text/csv")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error anonymizing CSV: {str(e)}")


@anonymize_router.get("/defaults")
async def get_anonymize_defaults():
    """
    Return the default anonymization config values parsed from config.yaml.
    Used by Node.js backend to get defaults instead of hardcoding.
    """
    try:
        defaults = get_config_defaults()
        return JSONResponse(content={"success": True, "defaults": defaults})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading defaults: {str(e)}")


@chat_router.post("/", response_model=InferenceResponse)
async def run_inference(request: InferenceRequest):
    """
    Perform annotation inference for the incoming sample

    Returns:
        model_name: Name of the model used to perfrom inference
        model_response: raw model response
        tokens: total number of tokens used (input + output) TODO: split into separate fields
        time: time taken (in seconds) to run inferencing
    """
    try:
        print(
            f"[AI Annotation] Request payload: model_name={request.model_name}, user_input={request.user_input}"
        )
        chat_service_obj = ChatService()
        prompt_template_obj = PromptTemplate()
        system_prompt = prompt_template_obj.get_task_system_prompt(request.task_type)
        inference_payload = {
            "labels": [l.dict() for l in request.labels],
            "case_notes": request.case_notes,
            "task_definition": request.task_definition,
            "user_input": request.user_input,
        }
        user_prompt = json.dumps(inference_payload, ensure_ascii=False)

        response = chat_service_obj.send_chat(
            request.labels,
            request.task_definition,
            request.model_name,
            system_prompt,
            request.case_notes,
            request.user_input,
        )
        inference_response: InferenceResponse = {
            "model_name": request.model_name,
            "label": response["label"],
            "span_text": response["span_text"],
            "reason": response["reason"],
            "raw_response": response.get("raw_response", ""),
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "task_type": request.task_type,
            "tokens": response.get("tokens", 0),
            "time": response.get("time", 0.0),
        }
        return inference_response
    except Exception as e:
        print("[Inference] Error while running inference: ", e)
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.post("/batch-inference", response_model=BatchInferenceSummary)
async def run_batch_inference(request: List[BatchInferenceRequest]):
    """
    Perform annotation inference for the incoming samples in parallel
    """
    try:
        chat_service_obj = ChatService()
        prompt_template_obj = PromptTemplate()
        
        # We assume all samples in a batch share the same task_type for the system prompt
        system_prompt = prompt_template_obj.get_task_system_prompt(request[0].task_type) if request else ""

        tasks = [
            process_single_sample(
                sample, 
                chat_service_obj, 
                system_prompt
            )
            for sample in request
        ]

        inference_results = await asyncio.gather(*tasks)
        
        # Calculate overall accuracy
        correct_count = sum(1 for res in inference_results if res.is_correct)
        accuracy = correct_count / len(inference_results) if inference_results else 0.0

        return BatchInferenceSummary(
            results=inference_results,
            accuracy=accuracy
        )

    except Exception as e:
        print("[Batch Inference] Error while running batch inference: ", e)
        raise HTTPException(status_code=500, detail=str(e))

async def process_single_sample(
    sample: BatchInferenceRequest, 
    chat_service_obj: ChatService, 
    system_prompt: str
) -> BatchInferenceResponse:
    """Process a single sample using a thread pool for the synchronous send_chat call"""
    response = await asyncio.to_thread(
        chat_service_obj.send_chat,
        sample.ground_truth_labels,
        sample.task_definition,
        sample.model_name,
        system_prompt,
        sample.case_notes,
        sample.user_input,
    )
    
    gt_label_names = [l.name for l in sample.ground_truth_labels]
    model_labels = response["label"]
    
    # Handle both single string and list of strings for model_labels
    if isinstance(model_labels, str):
        model_labels = [model_labels]
    
    return BatchInferenceResponse(
        model_name=sample.model_name,
        is_correct = set(gt_label_names) == set(model_labels),
        tokens=response.get("tokens", 0),
        time=response.get("time", 0.0),
    )

@chat_router.get("/val-eval/progress/{task_id}")
async def get_val_eval_progress(task_id: str):
    """Return live progress for an in-flight val-eval keyed by task_id."""
    entry = _eval_progress.get(task_id)
    if not entry:
        return {"completed": 0, "total": 0, "done": False}
    return entry

@chat_router.post("/val-eval/cancel/{task_id}")
async def cancel_val_eval(task_id: str):
    """Signal any in-flight val-eval for this task to abort."""
    _eval_run_ids[task_id] = "__cancelled__"
    return {"cancelled": True}


@chat_router.post("/val-eval", response_model=ValEvalResponse)
async def run_val_eval(request: ValEvalRequest):
    """
    Run inference on all val-dataset samples using the final codebook and return
    per-sample predictions alongside ground-truth labels for metric computation.
    Uses a semaphore to limit concurrent Ollama requests (matches OLLAMA_NUM_PARALLEL).
    A run_id guards against concurrent evals for the same task: if a newer request
    arrives (or an explicit cancel is issued), in-flight samples finish but waiting
    samples are skipped and the response returns 409.
    """
    try:
        chat_service_obj = ChatService()
        prompt_template_obj = PromptTemplate()
        system_prompt = prompt_template_obj.get_task_system_prompt(request.task_type) if request.samples else ""

        task_key = request.task_id or str(uuid.uuid4())
        run_id = str(uuid.uuid4())
        _eval_run_ids[task_key] = run_id

        total = len(request.samples)
        _eval_progress[task_key] = {"completed": 0, "total": total, "done": False}

        semaphore = asyncio.Semaphore(VAL_EVAL_CONCURRENCY)

        def is_active():
            return _eval_run_ids.get(task_key) == run_id

        async def infer_sample(sample):
            # Skip immediately if superseded before reaching the semaphore.
            if not is_active():
                _eval_progress[task_key]["completed"] += 1
                return ValEvalSampleResult(predicted=[], ground_truth=sample.ground_truth)
            async with semaphore:
                # Re-check after acquiring the semaphore.
                if not is_active():
                    _eval_progress[task_key]["completed"] += 1
                    return ValEvalSampleResult(predicted=[], ground_truth=sample.ground_truth)
                try:
                    response = await asyncio.to_thread(
                        chat_service_obj.send_chat,
                        request.labels,
                        request.task_definition,
                        request.model_name,
                        system_prompt,
                        sample.case_notes,
                        request.user_input,
                    )
                    predicted = response["label"]
                except Exception as e:
                    print(f"[Val Eval] Sample inference failed, recording as no-prediction: {e}")
                    predicted = []
            _eval_progress[task_key]["completed"] += 1
            return ValEvalSampleResult(predicted=predicted, ground_truth=sample.ground_truth)

        results = await asyncio.gather(*[infer_sample(s) for s in request.samples])

        if not is_active():
            raise HTTPException(status_code=409, detail="Evaluation was cancelled or superseded")

        _eval_progress[task_key]["done"] = True
        return ValEvalResponse(results=list(results))

    except HTTPException:
        raise
    except Exception as e:
        print("[Val Eval] Error while running val evaluation: ", e)
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.post("/rule-synthesis", response_model=RuleSynthesisResponse)
async def run_rule_synthesis(request: RuleSynthesisRequest):
    try:
        print(
            f"[Rule Synthesis] Request payload: model_name={request.model_name}"
        )
        rule_synthesis_service_obj = RuleSynthesisService()
        prompt_template_obj = PromptTemplate()
        system_prompt = prompt_template_obj.get_task_system_prompt(request.task_type)
        response = rule_synthesis_service_obj.send_chat(
            request.model_name,
            system_prompt,
            request.payload
        )
        rule_synthesis_response: RuleSynthesisResponse = {
            "success": response["success"],
            "model_name": request.model_name,
            "rules": response["rules"]
        }
        return rule_synthesis_response

    except Exception as e:
        print("[Rule synthesis] Error while running rule synthesis : ", e)
        raise HTTPException(status_code=500, detail=str(e))
from services.managedata.data_manager_service import DataManagerService

@embedding_router.post("/sample")
async def run_sampling(request: EmbedDatasetRequest):
    """
    Unified sampling flow.
    If use_representative_sampling is true, representative sampling runs first,
    then coverage sampling creates the guide set.
    """
    try:
        service = DataManagerService(request)
        service.run_sampling()
        return {"success": True, "message": "Sampling completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
