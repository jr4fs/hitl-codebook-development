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
import os
import logging

from models.embedding_schemas import EmbedDatasetRequest, EmbedDatasetResponse
from models.rule_synthesis_schema import RuleSynthesisRequest, RuleSynthesisResponse
#from services.embedding_service import EmbeddingService
from services.anonymizer.service import anonymize_csv_bytes, get_config_defaults
from models.ollama_adapter import InferenceRequest, InferenceResponse, BatchInferenceRequest, BatchInferenceResponse, BatchInferenceSummary
from services.chat.chat_service import ChatService
from models.prompt_templating_model import PromptTemplate
from services.chat.rule_synthesis_service import RuleSynthesisService

embedding_router = APIRouter(prefix="/embedding", tags=["embedding"])
chat_router = APIRouter(prefix="/inference", tags=["inference"])
anonymize_router = APIRouter(prefix="/anonymize", tags=["anonymize"])


@chat_router.get("/prompts")
async def get_prompts():
    """Expose the system prompt templates so other services (e.g. the Node
    metrics export) can read them over HTTP instead of pybackend's filesystem.
    pybackend remains the single source of truth for prompts."""
    pt = PromptTemplate()
    return {
        "annotation_task": pt.get_task_system_prompt("annotation"),
        "rule_synthesis": pt.get_task_system_prompt("rule_synthesis"),
    }

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

        # send_chat is a synchronous, network-bound call (OpenRouter/Ollama).
        # Run it off the event loop so one uvicorn worker can handle many
        # concurrent inference requests instead of serializing on each call.
        response = await asyncio.to_thread(
            chat_service_obj.send_chat,
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

@chat_router.post("/rule-synthesis", response_model=RuleSynthesisResponse)
async def run_rule_synthesis(request: RuleSynthesisRequest):
    try:
        print(
            f"[Rule Synthesis] Request payload: model_name={request.model_name}"
        )
        rule_synthesis_service_obj = RuleSynthesisService()
        prompt_template_obj = PromptTemplate()
        system_prompt = prompt_template_obj.get_task_system_prompt(request.task_type)
        # Off-load the blocking LLM call so it doesn't stall the event loop.
        response = await asyncio.to_thread(
            rule_synthesis_service_obj.send_chat,
            request.model_name,
            system_prompt,
            request.payload,
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
from services.managedata.sampling_queue import sampling_queue
from services.database.database_service import get_collection

logger = logging.getLogger("uvicorn.error")
TASKS_COLLECTION_NAME = os.getenv("TASKS_COLLECTION_NAME", "TaskDetails")


def _set_sampling_position(task_id: Optional[str], ahead: int) -> None:
    """Record how many sampling jobs are ahead of this task so the UI can show a
    queue position. Written to TaskDetails where the frontend already polls."""
    if not task_id:
        return
    try:
        from bson import ObjectId

        try:
            query_id = ObjectId(task_id)
        except Exception:
            query_id = task_id
        get_collection(TASKS_COLLECTION_NAME).update_one(
            {"_id": query_id}, {"$set": {"samplingQueuePosition": ahead}}
        )
    except Exception as exc:  # position is best-effort; never fail sampling for it
        logger.warning("Failed to update sampling queue position: %s", exc)


@embedding_router.post("/sample")
async def run_sampling(request: EmbedDatasetRequest):
    """
    Unified sampling flow, run through a concurrency-limited queue so concurrent
    uploads can't exhaust memory. If use_representative_sampling is true,
    representative sampling runs first, then coverage sampling creates the guide set.
    """
    try:
        service = DataManagerService(request)

        async def on_position(ahead: int) -> None:
            await asyncio.to_thread(_set_sampling_position, request.taskId, ahead)

        await sampling_queue.submit(service.run_sampling, on_position=on_position)
        return {"success": True, "message": "Sampling completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
